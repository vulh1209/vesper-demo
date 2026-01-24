import 'dotenv/config';
import { app } from './app.js';

// Import handlers for side effects (registers them with app)
import './commands/vesper.js';
import './events/app-mention.js';
import './events/dm-message.js';

const PORT = Number(process.env.BOT_PORT) || 3000;

(async () => {
  await app.start(PORT);
  console.log(`Bot is running on port ${PORT}`);
})();
