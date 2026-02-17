import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import type { JsonApiResource } from "../api/types.js";

export const getFeedbackDetailSchema = z.object({
  submission_id: z.string().describe("The feedback submission ID"),
  type: z
    .enum(["screenshot", "crash"])
    .describe("Type of feedback submission"),
});

export async function handleGetFeedbackDetail(
  client: AppStoreConnectClient,
  args: z.infer<typeof getFeedbackDetailSchema>
) {
  const endpoint =
    args.type === "screenshot"
      ? `/betaFeedbackScreenshotSubmissions/${args.submission_id}`
      : `/betaFeedbackCrashSubmissions/${args.submission_id}`;

  const response = await client.request<JsonApiResource>(endpoint, {
    include: "betaTester,build",
    "fields[betaTesters]": "firstName,lastName,email",
    "fields[builds]": "version,uploadedDate",
  });

  const data = response.data;
  const included = response.included ?? [];
  const attrs = data.attributes as Record<string, unknown>;

  const testerRef = data.relationships?.betaTester?.data;
  const buildRef = data.relationships?.build?.data;

  const tester =
    testerRef && !Array.isArray(testerRef)
      ? included.find((r) => r.type === "betaTesters" && r.id === testerRef.id)
      : null;
  const build =
    buildRef && !Array.isArray(buildRef)
      ? included.find((r) => r.type === "builds" && r.id === buildRef.id)
      : null;

  const testerAttrs = tester?.attributes as
    | { firstName?: string; lastName?: string; email?: string }
    | undefined;
  const buildAttrs = build?.attributes as
    | { version?: string; uploadedDate?: string }
    | undefined;

  return {
    id: data.id,
    type: args.type,
    timestamp: attrs.timestamp,
    comment: attrs.comment ?? null,
    tester: testerAttrs
      ? {
          name: `${testerAttrs.firstName ?? ""} ${testerAttrs.lastName ?? ""}`.trim(),
          email: testerAttrs.email,
        }
      : null,
    build: buildAttrs
      ? {
          version: buildAttrs.version,
          uploadedDate: buildAttrs.uploadedDate,
        }
      : null,
    device: {
      model: attrs.deviceModel,
      osVersion: attrs.osVersion,
      locale: attrs.locale,
      carrier: attrs.carrier,
      timezone: attrs.timezone,
      architecture: attrs.architecture,
      connectionStatus: attrs.connectionStatus,
      batteryPercentage: attrs.batteryPercentage,
      appUptime: attrs.appUptime,
      screenResolution:
        attrs.screenWidth != null
          ? `${attrs.screenWidth}x${attrs.screenHeight}`
          : null,
      diskSpaceFree: attrs.diskSpaceFree,
    },
    screenshot:
      args.type === "screenshot" && attrs.screenshotAsset
        ? attrs.screenshotAsset
        : null,
    crashLog:
      args.type === "crash"
        ? {
            url: `https://api.appstoreconnect.apple.com/v1/betaFeedbackCrashSubmissions/${data.id}/relationships/crashLog`,
          }
        : null,
  };
}
