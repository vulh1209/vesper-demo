import { app } from '../app.js';
import { buildWelcomeBlocks } from '../views/index.js';

// Track users who have been welcomed this session
// In-memory is sufficient - resets on bot restart, which is acceptable
const welcomedUsers = new Set<string>();

app.event('app_home_opened', async ({ event, client, say, logger }) => {
  const userId = event.user;

  // Guard: Already welcomed this session
  if (welcomedUsers.has(userId)) {
    return;
  }

  try {
    // Check if user has prior message history with the bot
    const result = await client.conversations.history({
      channel: event.channel,
      limit: 1,
    });

    // User has prior history - no welcome needed
    if (result.messages && result.messages.length > 0) {
      welcomedUsers.add(userId);
      return;
    }

    // Truly first interaction - send welcome
    welcomedUsers.add(userId);
    await say({ channel: event.channel, blocks: buildWelcomeBlocks() });
    logger.info(`Welcomed new user: ${userId}`);
  } catch (error) {
    logger.error('Failed to handle app_home_opened:', error);
  }
});
