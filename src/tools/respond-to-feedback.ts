import { z } from "zod";
import { createTransport, type Transporter } from "nodemailer";
import type { AppStoreConnectClient } from "../api/client.js";
import type { JsonApiResource } from "../api/types.js";

export const respondToFeedbackSchema = z.object({
  submission_id: z
    .string()
    .describe("The feedback submission ID to respond to"),
  submission_type: z
    .enum(["screenshot", "crash"])
    .describe("Type of feedback submission"),
  message: z
    .string()
    .describe(
      "The response message to send to the tester (e.g., 'We fixed the crash you reported in build 1.2.1')"
    ),
  subject: z
    .string()
    .optional()
    .describe(
      "Custom email subject line. Defaults to 'Your TestFlight feedback has been addressed'"
    ),
});

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables."
    );
  }

  transporter = createTransport({
    host,
    port: Number(port) || 587,
    secure: (Number(port) || 587) === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function handleRespondToFeedback(
  client: AppStoreConnectClient,
  args: z.infer<typeof respondToFeedbackSchema>
) {
  // 1. Fetch the feedback submission to get tester info
  const endpoint =
    args.submission_type === "screenshot"
      ? `/betaFeedbackScreenshotSubmissions/${args.submission_id}`
      : `/betaFeedbackCrashSubmissions/${args.submission_id}`;

  const response = await client.request<JsonApiResource>(endpoint, {
    include: "betaTester,build",
    "fields[betaTesters]": "firstName,lastName,email",
    "fields[builds]": "version",
  });

  const included = response.included ?? [];
  const testerRef = response.data.relationships?.betaTester?.data;

  if (!testerRef || Array.isArray(testerRef)) {
    return {
      success: false,
      error: "No tester associated with this feedback submission.",
    };
  }

  const tester = included.find(
    (r) => r.type === "betaTesters" && r.id === testerRef.id
  );
  const testerAttrs = tester?.attributes as
    | { firstName?: string; lastName?: string; email?: string }
    | undefined;

  if (!testerAttrs?.email) {
    return {
      success: false,
      error: "Tester email not available for this submission.",
    };
  }

  // 2. Get build version for context
  const buildRef = response.data.relationships?.build?.data;
  const build =
    buildRef && !Array.isArray(buildRef)
      ? included.find((r) => r.type === "builds" && r.id === buildRef.id)
      : null;
  const buildVersion = (build?.attributes as { version?: string } | undefined)
    ?.version;

  const testerName = testerAttrs.firstName
    ? `${testerAttrs.firstName}${testerAttrs.lastName ? ` ${testerAttrs.lastName}` : ""}`
    : "Beta Tester";

  // 3. Send the email
  const fromAddress =
    process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";
  const appName = process.env.APP_NAME || "our app";

  const subject =
    args.subject ?? "Your TestFlight feedback has been addressed";

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1d1d1f;">Thank you for your feedback!</h2>
      <p>Hi ${testerName},</p>
      <p>${args.message}</p>
      ${buildVersion ? `<p style="color: #86868b; font-size: 14px;">Regarding your ${args.submission_type} feedback on build ${buildVersion}.</p>` : ""}
      <hr style="border: none; border-top: 1px solid #d2d2d7; margin: 20px 0;" />
      <p style="color: #86868b; font-size: 12px;">
        This message was sent because you submitted feedback via TestFlight for ${appName}.
      </p>
    </div>
  `;

  const textBody = [
    `Hi ${testerName},`,
    "",
    args.message,
    "",
    buildVersion
      ? `Regarding your ${args.submission_type} feedback on build ${buildVersion}.`
      : "",
    "",
    `This message was sent because you submitted feedback via TestFlight for ${appName}.`,
  ]
    .filter(Boolean)
    .join("\n");

  const smtp = getTransporter();

  const info = await smtp.sendMail({
    from: fromAddress,
    to: testerAttrs.email,
    subject,
    text: textBody,
    html: htmlBody,
  });

  return {
    success: true,
    tester: {
      name: testerName,
      email: testerAttrs.email,
    },
    buildVersion: buildVersion ?? null,
    messageId: info.messageId,
    message: `Response sent to ${testerName} (${testerAttrs.email})`,
  };
}
