import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import { listBuilds } from "../api/builds.js";

export const listBuildsSchema = z.object({
  app_id: z.string().describe("App Store Connect app ID"),
  version: z
    .string()
    .optional()
    .describe("Filter by pre-release version string (e.g., '1.2.0')"),
  processing_state: z
    .enum(["PROCESSING", "FAILED", "INVALID", "VALID"])
    .optional()
    .describe("Filter by build processing state"),
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .describe("Maximum number of builds to return (default: 20)"),
});

export async function handleListBuilds(
  client: AppStoreConnectClient,
  args: z.infer<typeof listBuildsSchema>
) {
  const { builds, included } = await listBuilds(client, {
    appId: args.app_id,
    preReleaseVersion: args.version,
    processingState: args.processing_state,
    limit: args.limit,
  });

  return builds.map((build) => {
    const versionRef = build.relationships?.preReleaseVersion?.data;
    const versionResource =
      versionRef && !Array.isArray(versionRef)
        ? included.find(
            (r) => r.type === "preReleaseVersions" && r.id === versionRef.id
          )
        : null;
    const versionAttrs = versionResource?.attributes as
      | { version?: string; platform?: string }
      | undefined;

    return {
      id: build.id,
      buildNumber: build.attributes.version,
      appVersion: versionAttrs?.version ?? null,
      platform: versionAttrs?.platform ?? null,
      uploadedDate: build.attributes.uploadedDate,
      processingState: build.attributes.processingState,
      expired: build.attributes.expired,
      minOsVersion: build.attributes.minOsVersion,
    };
  });
}
