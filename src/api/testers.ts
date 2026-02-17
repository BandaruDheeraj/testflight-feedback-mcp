import type { AppStoreConnectClient } from "./client.js";
import type { BetaTester, BetaGroup, JsonApiResource } from "./types.js";

export interface ListTestersOptions {
  appId?: string;
  groupId?: string;
  email?: string;
  limit?: number;
  sort?: string;
}

export async function listBetaTesters(
  client: AppStoreConnectClient,
  options?: ListTestersOptions
): Promise<{ testers: BetaTester[]; included: JsonApiResource[] }> {
  const params: Record<string, string> = {
    "fields[betaTesters]": "firstName,lastName,email,inviteType,state",
    limit: String(options?.limit ?? 50),
    sort: options?.sort ?? "lastName",
  };

  if (options?.appId) {
    params["filter[apps]"] = options.appId;
  }
  if (options?.groupId) {
    params["filter[betaGroups]"] = options.groupId;
  }
  if (options?.email) {
    params["filter[email]"] = options.email;
  }

  const response = await client.requestAll<BetaTester>("/betaTesters", params);
  return { testers: response.data, included: response.included };
}

export async function listBetaGroups(
  client: AppStoreConnectClient,
  appId: string,
  options?: { limit?: number }
): Promise<BetaGroup[]> {
  const params: Record<string, string> = {
    "filter[app]": appId,
    "fields[betaGroups]":
      "name,isInternalGroup,publicLinkEnabled,publicLinkLimit,publicLink,feedbackEnabled",
    limit: String(options?.limit ?? 50),
  };

  const response = await client.requestAll<BetaGroup>(
    "/betaGroups",
    params
  );
  return response.data;
}
