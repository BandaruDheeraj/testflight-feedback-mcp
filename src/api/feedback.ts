import type { AppStoreConnectClient } from "./client.js";
import { fetchWithBrowserAuth, isEnabled as isBrowserEnabled } from "../auth/browser.js";
import type {
  BetaFeedbackScreenshotSubmission,
  BetaFeedbackCrashSubmission,
  FeedbackItem,
  JsonApiResource,
  IrisBetaFeedback,
} from "./types.js";

export interface ListFeedbackOptions {
  appId: string;
  buildId?: string;
  limit?: number;
  sort?: string;
}

/**
 * List screenshot feedback via official API
 */
export async function listScreenshotFeedback(
  client: AppStoreConnectClient,
  options: ListFeedbackOptions
): Promise<{
  submissions: BetaFeedbackScreenshotSubmission[];
  included: JsonApiResource[];
}> {
  // Apple forbids GET on the top-level /betaFeedbackScreenshotSubmissions collection
  // (403 FORBIDDEN_ERROR). It is only readable as an app-scoped sub-resource.
  const params: Record<string, string> = {
    limit: String(options.limit ?? 50),
    sort: options.sort ?? "-createdDate",
    include: "tester,build",
    "fields[betaTesters]": "firstName,lastName,email",
    "fields[builds]": "version",
  };

  if (options.buildId) {
    params["filter[build]"] = options.buildId;
  }

  const response = await client.requestAll<BetaFeedbackScreenshotSubmission>(
    `/apps/${options.appId}/betaFeedbackScreenshotSubmissions`,
    params
  );
  return { submissions: response.data, included: response.included };
}

/**
 * List crash feedback via official API
 */
export async function listCrashFeedback(
  client: AppStoreConnectClient,
  options: ListFeedbackOptions
): Promise<{
  submissions: BetaFeedbackCrashSubmission[];
  included: JsonApiResource[];
}> {
  // Same constraint as screenshots: only readable as an app-scoped sub-resource.
  const params: Record<string, string> = {
    limit: String(options.limit ?? 50),
    sort: options.sort ?? "-createdDate",
    include: "tester,build",
    "fields[betaTesters]": "firstName,lastName,email",
    "fields[builds]": "version",
  };

  if (options.buildId) {
    params["filter[build]"] = options.buildId;
  }

  const response = await client.requestAll<BetaFeedbackCrashSubmission>(
    `/apps/${options.appId}/betaFeedbackCrashSubmissions`,
    params
  );
  return { submissions: response.data, included: response.included };
}

/**
 * Get crash log content for a specific crash submission
 */
export async function getCrashLog(
  client: AppStoreConnectClient,
  crashSubmissionId: string
): Promise<string> {
  const response = await client.request<JsonApiResource>(
    `/betaFeedbackCrashSubmissions/${crashSubmissionId}/relationships/crashLog`
  );
  // The crash log is returned as a resource with content attribute
  const attrs = response.data?.attributes as Record<string, unknown> | undefined;
  return (attrs?.content as string) ?? "No crash log content available.";
}

/**
 * Fetch full feedback (including text comments) via internal iris API.
 * Falls back gracefully if browser auth is not enabled or fails.
 */
export async function listIrisFeedback(
  appId: string,
  options?: { buildId?: string; limit?: number }
): Promise<FeedbackItem[] | null> {
  if (!isBrowserEnabled()) return null;

  let url = `https://appstoreconnect.apple.com/iris/v1/betaFeedbacks?filter[build.app]=${appId}&sort=-timestamp&exists[crash]=false&include=tester,build,screenshots,buildBundle&fields[betaTesters]=firstName,lastName&fields[builds]=version&limit=${options?.limit ?? 60}`;

  if (options?.buildId) {
    url += `&filter[build]=${options.buildId}`;
  }

  const response = await fetchWithBrowserAuth(url);
  if (!response) return null;

  try {
    const json = (await response.json()) as {
      data: IrisBetaFeedback[];
      included?: JsonApiResource[];
    };

    return json.data.map((item) => {
      const testerRef = item.relationships?.tester?.data;
      const buildRef = item.relationships?.build?.data;
      const included = json.included ?? [];

      const tester = testerRef
        ? included.find((r) => r.type === "betaTesters" && r.id === testerRef.id)
        : null;
      const build = buildRef
        ? included.find((r) => r.type === "builds" && r.id === buildRef.id)
        : null;

      const testerAttrs = tester?.attributes as
        | { firstName?: string; lastName?: string }
        | undefined;
      const buildAttrs = build?.attributes as
        | { version?: string }
        | undefined;

      return {
        id: item.id,
        type: "comment" as const,
        timestamp: item.attributes.timestamp,
        comment: item.attributes.comment,
        testerName: testerAttrs
          ? `${testerAttrs.firstName ?? ""} ${testerAttrs.lastName ?? ""}`.trim() || null
          : null,
        testerEmail: item.attributes.emailAddress,
        buildVersion: buildAttrs?.version ?? null,
        deviceModel: item.attributes.deviceModel,
        osVersion: item.attributes.osVersion,
        locale: item.attributes.locale,
        carrier: item.attributes.carrier,
        timezone: item.attributes.timezone,
        architecture: item.attributes.architecture,
        connectionStatus: item.attributes.connectionStatus,
        batteryPercentage: item.attributes.batteryPercentage,
        appUptime: item.attributes.appUptime,
        screenResolution: item.attributes.screenWidth
          ? `${item.attributes.screenWidth}x${item.attributes.screenHeight}`
          : null,
        diskSpaceFree: item.attributes.diskSpaceFree,
        screenshotUrl: null,
        crashLogUrl: null,
      };
    });
  } catch {
    console.error("Failed to parse iris feedback response");
    return null;
  }
}

/**
 * Convert official API submissions to unified FeedbackItem format
 */
export function toFeedbackItems(
  submissions: (BetaFeedbackScreenshotSubmission | BetaFeedbackCrashSubmission)[],
  included: JsonApiResource[],
  type: "screenshot" | "crash"
): FeedbackItem[] {
  return submissions.map((sub) => {
    // Apple's relationship key is `tester` (not `betaTester`).
    const testerRef =
      sub.relationships?.tester?.data ?? sub.relationships?.betaTester?.data;
    const buildRef = sub.relationships?.build?.data;

    const tester =
      testerRef && !Array.isArray(testerRef)
        ? included.find(
            (r) => r.type === "betaTesters" && r.id === testerRef.id
          )
        : null;
    const build =
      buildRef && !Array.isArray(buildRef)
        ? included.find((r) => r.type === "builds" && r.id === buildRef.id)
        : null;

    const testerAttrs = tester?.attributes as
      | { firstName?: string; lastName?: string; email?: string }
      | undefined;
    const buildAttrs = build?.attributes as
      | { version?: string }
      | undefined;

    const attrs = sub.attributes as unknown as Record<string, unknown>;
    // Official API exposes screenshots as an array of { url, ... } objects.
    const screenshots = attrs.screenshots as
      | Array<{ url?: string }>
      | undefined;

    return {
      id: sub.id,
      type,
      // Official API uses `createdDate`, not `timestamp`.
      timestamp: (attrs.createdDate as string) ?? (attrs.timestamp as string),
      comment: (attrs.comment as string) ?? null,
      testerName: testerAttrs
        ? `${testerAttrs.firstName ?? ""} ${testerAttrs.lastName ?? ""}`.trim() || null
        : null,
      testerEmail: (testerAttrs?.email as string) ?? null,
      buildVersion: buildAttrs?.version ?? null,
      deviceModel: attrs.deviceModel as string,
      osVersion: attrs.osVersion as string,
      locale: attrs.locale as string,
      carrier: (attrs.carrier as string) ?? null,
      timezone: (attrs.timeZone as string) ?? (attrs.timezone as string) ?? null,
      architecture: attrs.architecture as string,
      connectionStatus:
        (attrs.connectionType as string) ?? (attrs.connectionStatus as string) ?? null,
      batteryPercentage: (attrs.batteryPercentage as number) ?? null,
      appUptime:
        (attrs.appUptimeInMilliseconds as number) ?? (attrs.appUptime as number) ?? null,
      screenResolution:
        attrs.screenWidthInPoints != null
          ? `${attrs.screenWidthInPoints}x${attrs.screenHeightInPoints}`
          : null,
      diskSpaceFree:
        (attrs.diskBytesAvailable as number) ?? (attrs.diskSpaceFree as number) ?? null,
      screenshotUrl: screenshots?.[0]?.url ?? null,
      crashLogUrl:
        type === "crash"
          ? `https://api.appstoreconnect.apple.com/v1/betaFeedbackCrashSubmissions/${sub.id}/relationships/crashLog`
          : null,
    };
  });
}
