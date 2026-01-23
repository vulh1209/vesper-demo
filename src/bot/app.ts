import { App, LogLevel } from '@slack/bolt';

// Use existing environment validation pattern
const requiredEnvVars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: !!process.env.SLACK_APP_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
});
