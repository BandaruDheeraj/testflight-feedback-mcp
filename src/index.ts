#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./auth/jwt.js";
import { AppStoreConnectClient } from "./api/client.js";
import { listAppsSchema, handleListApps } from "./tools/list-apps.js";
import { listBuildsSchema, handleListBuilds } from "./tools/list-builds.js";
import {
  listTestersSchema,
  handleListTesters,
  listGroupsSchema,
  handleListGroups,
} from "./tools/list-testers.js";
import {
  listFeedbackSchema,
  handleListFeedback,
} from "./tools/list-feedback.js";
import {
  getFeedbackDetailSchema,
  handleGetFeedbackDetail,
} from "./tools/get-feedback-detail.js";
import { getCrashLogSchema, handleGetCrashLog } from "./tools/get-crash-log.js";

async function main() {
  const config = await loadConfig();
  const client = new AppStoreConnectClient(config);

  const server = new McpServer({
    name: "testflight-feedback",
    version: "1.0.0",
  });

  // --- Tools ---

  server.tool(
    "list_apps",
    "List all apps in your App Store Connect account. Returns app ID, name, bundle ID, and SKU.",
    listAppsSchema.shape,
    async (args) => {
      const result = await handleListApps(client, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "list_builds",
    "List TestFlight builds for an app. Filter by version or processing state. Returns build number, version, upload date, and status.",
    listBuildsSchema.shape,
    async (args) => {
      const result = await handleListBuilds(client, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "list_beta_testers",
    "List beta testers. Filter by app, group, or email. Returns tester name, email, invite type, and state.",
    listTestersSchema.shape,
    async (args) => {
      const result = await handleListTesters(client, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "list_beta_groups",
    "List beta tester groups for an app. Returns group name, internal/external status, and feedback settings.",
    listGroupsSchema.shape,
    async (args) => {
      const result = await handleListGroups(client, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "list_feedback",
    "List TestFlight feedback for an app. Retrieves screenshot submissions, crash reports, and (with browser auth) text comments. Filter by build or feedback type.",
    listFeedbackSchema.shape,
    async (args) => {
      const result = await handleListFeedback(client, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "get_feedback_detail",
    "Get detailed information about a specific feedback submission, including device info, tester details, screenshot asset, or crash log reference.",
    getFeedbackDetailSchema.shape,
    async (args) => {
      const result = await handleGetFeedbackDetail(client, args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    "get_crash_log",
    "Download the crash log content for a specific beta feedback crash submission.",
    getCrashLogSchema.shape,
    async (args) => {
      const result = await handleGetCrashLog(client, args);
      return {
        content: [{ type: "text", text: result.crashLog }],
      };
    }
  );

  // --- Start ---

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
