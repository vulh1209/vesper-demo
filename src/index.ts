import 'dotenv/config';

console.log('Vesper starting...');
console.log('Database URL configured:', !!process.env.DATABASE_URL);
console.log('Redis URL configured:', !!process.env.REDIS_URL);
console.log('Slack token configured:', !!process.env.SLACK_BOT_TOKEN);
