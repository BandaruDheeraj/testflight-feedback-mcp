import type { AppStoreConnectClient } from "./client.js";
import type { Build, JsonApiResource } from "./types.js";

export interface ListBuildsOptions {
  appId: string;
  limit?: number;
  preReleaseVersion?: string;
  processingState?: "PROCESSING" | "FAILED" | "INVALID" | "VALID";
  sort?: string;
}

export async function listBuilds(
  client: AppStoreConnectClient,
  options: ListBuildsOptions
): Promise<{ builds: Build[]; included: JsonApiResource[] }> {
  const params: Record<string, string> = {
    "filter[app]": options.appId,
    "fields[builds]":
      "version,uploadedDate,expirationDate,expired,minOsVersion,processingState,buildAudienceType",
    include: "preReleaseVersion",
    "fields[preReleaseVersions]": "version,platform",
    limit: String(options.limit ?? 20),
    sort: options.sort ?? "-uploadedDate",
  };

  if (options.preReleaseVersion) {
    params["filter[preReleaseVersion.version]"] = options.preReleaseVersion;
  }
  if (options.processingState) {
    params["filter[processingState]"] = options.processingState;
  }

  const response = await client.requestAll<Build>("/builds", params);
  return { builds: response.data, included: response.included };
}

export async function getBuild(
  client: AppStoreConnectClient,
  buildId: string
): Promise<Build> {
  const response = await client.request<Build>(`/builds/${buildId}`, {
    "fields[builds]":
      "version,uploadedDate,expirationDate,expired,minOsVersion,processingState,buildAudienceType",
  });
  return response.data;
}
