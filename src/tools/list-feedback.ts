import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import {
  listScreenshotFeedback,
  listCrashFeedback,
  listIrisFeedback,
  toFeedbackItems,
} from "../api/feedback.js";
import type { FeedbackItem } from "../api/types.js";

export const listFeedbackSchema = z.object({
  app_id: z.string().describe("App Store Connect app ID"),
  build_id: z
    .string()
    .optional()
    .describe("Filter feedback by build ID"),
  type: z
    .enum(["all", "screenshots", "crashes", "comments"])
    .optional()
    .describe(
      "Type of feedback to retrieve. 'comments' requires browser auth. Default: 'all'"
    ),
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .describe("Maximum number of feedback items per type (default: 50)"),
});

export async function handleListFeedback(
  client: AppStoreConnectClient,
  args: z.infer<typeof listFeedbackSchema>
): Promise<{
  feedback: FeedbackItem[];
  sources: string[];
  note?: string;
}> {
  const feedbackType = args.type ?? "all";
  const allFeedback: FeedbackItem[] = [];
  const sources: string[] = [];
  let note: string | undefined;

  const opts = {
    appId: args.app_id,
    buildId: args.build_id,
    limit: args.limit,
  };

  // Screenshot feedback (official API)
  if (feedbackType === "all" || feedbackType === "screenshots") {
    try {
      const { submissions, included } = await listScreenshotFeedback(client, opts);
      const items = toFeedbackItems(submissions, included, "screenshot");
      allFeedback.push(...items);
      sources.push("official-api:screenshots");
    } catch (error) {
      note = `Screenshot feedback fetch failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // Crash feedback (official API)
  if (feedbackType === "all" || feedbackType === "crashes") {
    try {
      const { submissions, included } = await listCrashFeedback(client, opts);
      const items = toFeedbackItems(submissions, included, "crash");
      allFeedback.push(...items);
      sources.push("official-api:crashes");
    } catch (error) {
      const msg = `Crash feedback fetch failed: ${error instanceof Error ? error.message : String(error)}`;
      note = note ? `${note}; ${msg}` : msg;
    }
  }

  // Text comments (iris API, requires browser auth)
  if (feedbackType === "all" || feedbackType === "comments") {
    const irisFeedback = await listIrisFeedback(args.app_id, {
      buildId: args.build_id,
      limit: args.limit,
    });
    if (irisFeedback) {
      allFeedback.push(...irisFeedback);
      sources.push("iris-api:comments");
    } else if (feedbackType === "comments") {
      note = note
        ? `${note}; Text comments require ENABLE_BROWSER_AUTH=true`
        : "Text comments require ENABLE_BROWSER_AUTH=true with ASC_USERNAME and ASC_PASSWORD set.";
    }
  }

  // Sort all by timestamp descending
  allFeedback.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return { feedback: allFeedback, sources, note };
}
