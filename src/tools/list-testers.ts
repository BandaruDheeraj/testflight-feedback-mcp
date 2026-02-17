import { z } from "zod";
import type { AppStoreConnectClient } from "../api/client.js";
import { listBetaTesters, listBetaGroups } from "../api/testers.js";

export const listTestersSchema = z.object({
  app_id: z
    .string()
    .optional()
    .describe("Filter testers by app ID"),
  group_id: z
    .string()
    .optional()
    .describe("Filter testers by beta group ID"),
  email: z
    .string()
    .optional()
    .describe("Filter by tester email address"),
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .describe("Maximum number of testers to return (default: 50)"),
});

export async function handleListTesters(
  client: AppStoreConnectClient,
  args: z.infer<typeof listTestersSchema>
) {
  const { testers } = await listBetaTesters(client, {
    appId: args.app_id,
    groupId: args.group_id,
    email: args.email,
    limit: args.limit,
  });

  return testers.map((t) => ({
    id: t.id,
    firstName: t.attributes.firstName,
    lastName: t.attributes.lastName,
    email: t.attributes.email,
    inviteType: t.attributes.inviteType,
    state: t.attributes.state,
  }));
}

export const listGroupsSchema = z.object({
  app_id: z.string().describe("App Store Connect app ID"),
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .describe("Maximum number of groups to return (default: 50)"),
});

export async function handleListGroups(
  client: AppStoreConnectClient,
  args: z.infer<typeof listGroupsSchema>
) {
  const groups = await listBetaGroups(client, args.app_id, {
    limit: args.limit,
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.attributes.name,
    isInternalGroup: g.attributes.isInternalGroup,
    publicLinkEnabled: g.attributes.publicLinkEnabled,
    feedbackEnabled: g.attributes.feedbackEnabled,
  }));
}
