import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import { getCrashLog } from "../api/feedback.js";

export const getCrashLogSchema = z.object({
  crash_submission_id: z
    .string()
    .describe("The beta feedback crash submission ID"),
});

export async function handleGetCrashLog(
  client: AppStoreConnectClient,
  args: z.infer<typeof getCrashLogSchema>
) {
  const content = await getCrashLog(client, args.crash_submission_id);
  return { crashLog: content };
}
