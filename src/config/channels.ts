import { db } from '../db/client.js';
import { channels } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface ChannelConfig {
  id: string;
  name: string;
  category?: string;  // Asset category derived from channel
}

// Default channels to track (can be overridden via env or database)
// Format: CHANNEL_ID:name:category
const DEFAULT_CHANNELS: ChannelConfig[] = [
  // Add your channels here, or load from env
  // { id: 'C1234567890', name: 'art-assets', category: '2d' },
  // { id: 'C0987654321', name: 'sound-assets', category: 'sound' },
];

/**
 * Get configured channels from database, falling back to defaults
 */
export async function getConfiguredChannels(): Promise<ChannelConfig[]> {
  // First try to get from database
  const dbChannels = await db.select().from(channels);

  if (dbChannels.length > 0) {
    return dbChannels.map(ch => ({
      id: ch.id,
      name: ch.name,
      category: undefined,  // Category stored on assets, not channels
    }));
  }

  // Fall back to defaults from env or hardcoded
  const envChannels = process.env.SLACK_CHANNELS;
  if (envChannels) {
    return envChannels.split(',').map(config => {
      const [id, name, category] = config.trim().split(':');
      return { id, name: name || id, category };
    });
  }

  return DEFAULT_CHANNELS;
}

/**
 * Add a channel to track
 */
export async function addChannel(id: string, name: string): Promise<void> {
  await db.insert(channels).values({
    id,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: channels.id,
    set: { name, updatedAt: new Date() },
  });
}

/**
 * Get sync state for a channel
 */
export async function getChannelSyncState(channelId: string) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId));

  return channel ? {
    lastSyncTs: channel.lastSyncTs,
    lastSyncAt: channel.lastSyncAt,
  } : null;
}

/**
 * Update sync state after successful scrape
 */
export async function updateChannelSyncState(
  channelId: string,
  lastSyncTs: string
): Promise<void> {
  await db
    .update(channels)
    .set({
      lastSyncTs,
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(channels.id, channelId));
}
