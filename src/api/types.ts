// App Store Connect API response types (JSON:API format)

export interface JsonApiResponse<T> {
  data: T;
  included?: JsonApiResource[];
  links?: PaginationLinks;
  meta?: { paging?: { total: number } };
}

export interface JsonApiResource {
  type: string;
  id: string;
  attributes?: Record<string, unknown> | object;
  relationships?: Record<string, { data: JsonApiRef | JsonApiRef[] | null; links?: { related?: string } }>;
  links?: { self?: string };
}

export interface JsonApiRef {
  type: string;
  id: string;
}

export interface PaginationLinks {
  self?: string;
  first?: string;
  next?: string;
}

// Apps
export interface AppAttributes {
  name: string;
  bundleId: string;
  sku: string;
  primaryLocale: string;
}

export interface App extends JsonApiResource {
  type: "apps";
  attributes: AppAttributes;
}

// Builds
export interface BuildAttributes {
  version: string;
  uploadedDate: string;
  expirationDate: string;
  expired: boolean;
  minOsVersion: string;
  processingState: "PROCESSING" | "FAILED" | "INVALID" | "VALID";
  buildAudienceType?: string;
  iconAssetToken?: { templateUrl: string; width: number; height: number };
}

export interface Build extends JsonApiResource {
  type: "builds";
  attributes: BuildAttributes;
}

// Beta Testers
export interface BetaTesterAttributes {
  firstName: string | null;
  lastName: string | null;
  email: string;
  inviteType: "EMAIL" | "PUBLIC_LINK";
  state: "INVITED" | "ACCEPTED" | "INSTALLED" | "NOT_INVITED";
}

export interface BetaTester extends JsonApiResource {
  type: "betaTesters";
  attributes: BetaTesterAttributes;
}

// Beta Groups
export interface BetaGroupAttributes {
  name: string;
  isInternalGroup: boolean;
  publicLinkEnabled: boolean;
  publicLinkLimit: number | null;
  publicLink: string | null;
  feedbackEnabled: boolean;
}

export interface BetaGroup extends JsonApiResource {
  type: "betaGroups";
  attributes: BetaGroupAttributes;
}

// Beta Feedback Screenshot Submissions
export interface BetaFeedbackScreenshotSubmissionAttributes {
  screenshotAsset?: {
    templateUrl: string;
    width: number;
    height: number;
    fileSize: number;
  };
  comment: string | null;
  timestamp: string;
  deviceModel: string;
  osVersion: string;
  locale: string;
  carrier: string | null;
  timezone: string;
  architecture: string;
  connectionStatus: string;
  pairedAppleWatch: string | null;
  appUptime: number | null;
  batteryPercentage: number | null;
  diskSpaceFree: number | null;
  screenWidth: number;
  screenHeight: number;
}

export interface BetaFeedbackScreenshotSubmission extends JsonApiResource {
  type: "betaFeedbackScreenshotSubmissions";
  attributes: BetaFeedbackScreenshotSubmissionAttributes;
}

// Beta Feedback Crash Submissions
export interface BetaFeedbackCrashSubmissionAttributes {
  timestamp: string;
  deviceModel: string;
  osVersion: string;
  locale: string;
  carrier: string | null;
  timezone: string;
  architecture: string;
  connectionStatus: string;
  appUptime: number | null;
  batteryPercentage: number | null;
}

export interface BetaFeedbackCrashSubmission extends JsonApiResource {
  type: "betaFeedbackCrashSubmissions";
  attributes: BetaFeedbackCrashSubmissionAttributes;
}

// Iris API types (internal, via browser auth)
export interface IrisBetaFeedback {
  id: string;
  type: "betaFeedbacks";
  attributes: {
    timestamp: string;
    comment: string | null;
    emailAddress: string | null;
    deviceModel: string;
    osVersion: string;
    locale: string;
    carrier: string | null;
    timezone: string;
    architecture: string;
    connectionStatus: string;
    batteryPercentage: number | null;
    screenWidth: number;
    screenHeight: number;
    appUptime: number | null;
    diskSpaceFree: number | null;
    pairedAppleWatch: string | null;
  };
  relationships?: {
    tester?: { data: JsonApiRef | null };
    build?: { data: JsonApiRef | null };
    screenshots?: { data: JsonApiRef[] };
  };
}

// Unified feedback type for MCP tool responses
export interface FeedbackItem {
  id: string;
  type: "screenshot" | "crash" | "comment";
  timestamp: string;
  comment: string | null;
  testerName: string | null;
  testerEmail: string | null;
  buildVersion: string | null;
  deviceModel: string;
  osVersion: string;
  locale: string;
  carrier: string | null;
  timezone: string;
  architecture: string;
  connectionStatus: string;
  batteryPercentage: number | null;
  appUptime: number | null;
  screenResolution: string | null;
  diskSpaceFree: number | null;
  screenshotUrl: string | null;
  crashLogUrl: string | null;
}
