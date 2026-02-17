import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import { listApps } from "../api/apps.js";

export const listAppsSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .describe("Maximum number of apps to return (default: 50)"),
});

export async function handleListApps(
  client: AppStoreConnectClient,
  args: z.infer<typeof listAppsSchema>
) {
  const apps = await listApps(client, { limit: args.limit });
  return apps.map((app) => ({
    id: app.id,
    name: app.attributes.name,
    bundleId: app.attributes.bundleId,
    sku: app.attributes.sku,
    primaryLocale: app.attributes.primaryLocale,
  }));
}
