import type { AppStoreConnectClient } from "./client.js";
import type { App } from "./types.js";

export async function listApps(
  client: AppStoreConnectClient,
  options?: { limit?: number }
): Promise<App[]> {
  const params: Record<string, string> = {
    "fields[apps]": "name,bundleId,sku,primaryLocale",
    limit: String(options?.limit ?? 50),
  };

  const response = await client.requestAll<App>("/apps", params);
  return response.data;
}

export async function getApp(
  client: AppStoreConnectClient,
  appId: string
): Promise<App> {
  const response = await client.request<App>(`/apps/${appId}`, {
    "fields[apps]": "name,bundleId,sku,primaryLocale",
  });
  return response.data;
}
