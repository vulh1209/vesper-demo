import { App, LogLevel } from '@slack/bolt';

// Validate required environment variables
const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create Bolt app instance
// Using HTTP mode (not Socket Mode) for production reliability
export const slack = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // Socket mode only for local dev - HTTP for production
  socketMode: !!process.env.SLACK_APP_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
});

// Export client for direct API access
export const slackClient = slack.client;

// Workspace URL for permalink construction
export const workspaceUrl = process.env.SLACK_WORKSPACE_URL || '';

// Helper to construct permalink without API call (works for public channels)
export function constructPermalink(channelId: string, messageTs: string): string {
  if (!workspaceUrl) {
    return '';  // Can't construct without workspace URL
  }
  // ts format: "1234567890.123456" -> "p1234567890123456"
  const tsWithoutDot = messageTs.replace('.', '');
  // Remove trailing slash from workspaceUrl to avoid double slashes
  const baseUrl = workspaceUrl.replace(/\/+$/, '');
  return `${baseUrl}/archives/${channelId}/p${tsWithoutDot}`;
}

// User name cache to avoid excessive API calls
const userNameCache = new Map<string, string | null>();

/**
 * Get user display name from Slack user ID
 * Results are cached to avoid rate limits
 */
export async function getUserDisplayName(userId: string): Promise<string | null> {
  if (!userId) return null;

  // Check cache first
  if (userNameCache.has(userId)) {
    return userNameCache.get(userId) ?? null;
  }

  try {
    const result = await slackClient.users.info({ user: userId });
    const displayName = result.user?.profile?.display_name
      || result.user?.profile?.real_name
      || result.user?.name
      || null;

    userNameCache.set(userId, displayName);
    return displayName;
  } catch (error) {
    console.error(`[slack] Failed to get user info for ${userId}:`, error);
    userNameCache.set(userId, null);  // Cache failures too
    return null;
  }
}
