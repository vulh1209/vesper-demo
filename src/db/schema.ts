import { pgTable, text, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Reusable timestamp columns
const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
};

// Tracked Slack channels - stores sync state per channel
export const channels = pgTable('channels', {
  id: text('id').primaryKey(),  // Slack channel ID (e.g., C1234567890)
  name: text('name').notNull(),
  lastSyncTs: text('last_sync_ts'),  // Last synced message ts (Slack timestamp format)
  lastSyncAt: timestamp('last_sync_at'),
  ...timestamps,
});

// Assets - unique by normalized name, tracks latest version
export const assets = pgTable('assets', {
  id: text('id').primaryKey(),  // UUID
  rawName: text('raw_name').notNull(),  // Original name as posted (e.g., "Ho Ly")
  normalizedName: text('normalized_name').notNull(),  // Normalized for matching (e.g., "ho ly")
  category: text('category'),  // sound, 3d, 2d, animation, ui, story (nullable - derived from channel)
  latestVersion: text('latest_version'),  // Denormalized for quick access
  latestVersionId: text('latest_version_id'),  // FK to asset_versions
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_assets_normalized_name').on(table.normalizedName),
]);

// Version history per asset - each row is one version mention in Slack
export const assetVersions = pgTable('asset_versions', {
  id: text('id').primaryKey(),  // UUID
  assetId: text('asset_id').notNull().references(() => assets.id),
  version: text('version').notNull(),  // e.g., "3", "2.1", "final"
  author: text('author'),  // Slack user ID
  authorName: text('author_name'),  // Resolved display name (may be null if lookup fails)
  slackChannelId: text('slack_channel_id').notNull(),
  slackMessageTs: text('slack_message_ts').notNull(),  // MUST be string - float precision issues
  slackPermalink: text('slack_permalink'),  // Generated or fetched permalink
  rawMessage: text('raw_message'),  // Original message text for context
  ...timestamps,
}, (table) => [
  index('idx_versions_asset_id').on(table.assetId),
  index('idx_versions_created_at').on(table.createdAt),
  // Prevent duplicate version entries from same message
  uniqueIndex('idx_versions_unique').on(table.slackChannelId, table.slackMessageTs, table.assetId),
]);

// Raw Slack messages - stored for debugging and reprocessing
export const slackMessages = pgTable('slack_messages', {
  id: text('id').primaryKey(),  // channelId:messageTs composite
  channelId: text('channel_id').notNull(),
  messageTs: text('message_ts').notNull(),  // Slack timestamp as string
  userId: text('user_id'),
  text: text('text'),  // Message text (may be edited, store as-is)
  messageData: jsonb('message_data').notNull(),  // Full Slack message payload
  processed: timestamp('processed_at'),  // When asset extraction ran
  ...timestamps,
}, (table) => [
  index('idx_messages_channel_ts').on(table.channelId, table.messageTs),
  index('idx_messages_processed').on(table.processed),
]);

// Relations for type-safe joins
export const assetsRelations = relations(assets, ({ many }) => ({
  versions: many(assetVersions),
}));

export const assetVersionsRelations = relations(assetVersions, ({ one }) => ({
  asset: one(assets, {
    fields: [assetVersions.assetId],
    references: [assets.id],
  }),
}));

export const channelsRelations = relations(channels, ({ many }) => ({
  messages: many(slackMessages),
}));

export const slackMessagesRelations = relations(slackMessages, ({ one }) => ({
  channel: one(channels, {
    fields: [slackMessages.channelId],
    references: [channels.id],
  }),
}));
