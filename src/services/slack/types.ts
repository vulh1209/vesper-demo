// Slack message structure (subset of full Slack message)
export interface SlackMessage {
  ts: string;  // Slack timestamp - MUST be string
  text?: string;
  user?: string;
  thread_ts?: string;  // Present if message is in/starts a thread
  reply_count?: number;
  subtype?: string;  // e.g., 'channel_join', 'bot_message'
  edited?: {
    user: string;
    ts: string;
  };
}

// Channel sync state (mirrors db schema)
export interface ChannelSyncState {
  channelId: string;
  lastSyncTs: string | null;
  lastSyncAt: Date | null;
}

// Scrape result
export interface ScrapeResult {
  channelId: string;
  messages: SlackMessage[];
  newestTs: string | null;
  oldestTs: string | null;
  totalFetched: number;
}
