# Vesper Setup Guide

Complete guide for setting up Vesper - the Slack asset version tracking system.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env
# Edit .env with your credentials

# 3. Start PostgreSQL and Redis (Docker)
docker run -d --name vesper-postgres -p 5432:5432 \
  -e POSTGRES_USER=vesper -e POSTGRES_PASSWORD=vesper -e POSTGRES_DB=vesper \
  postgres:16

docker run -d --name vesper-redis -p 6379:6379 redis:7

# 4. Initialize database
npm run db:push

# 5. Run the bot
npm run bot
```

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ with pg_trgm extension
- Redis 6+
- A Slack workspace with admin access

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

**Option A: Docker (recommended)**

```bash
docker run -d --name vesper-postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=vesper \
  -e POSTGRES_PASSWORD=vesper \
  -e POSTGRES_DB=vesper \
  postgres:16
```

**Option B: Local PostgreSQL**

```sql
CREATE USER vesper WITH PASSWORD 'vesper';
CREATE DATABASE vesper OWNER vesper;
\c vesper
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Initialize the schema:

```bash
npm run db:push        # Development: push schema directly
# OR
npm run db:migrate     # Production: run migrations
```

Verify connection:

```bash
npm run db:verify
```

### 3. Redis Setup

**Docker:**

```bash
docker run -d --name vesper-redis -p 6379:6379 redis:7
```

**Local:**

Install Redis via Homebrew (macOS) or apt (Linux) and start the service.

### 4. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `SLACK_BOT_TOKEN` | Yes | Bot token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Yes | App signing secret |
| `SLACK_APP_TOKEN` | Yes | App-level token for socket mode (xapp-...) |
| `SLACK_WORKSPACE_URL` | Yes | Workspace URL for permalinks |
| `OPENAI_API_KEY` | One of | OpenAI API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | One of | Gemini API key (preferred - cheaper) |
| `LLM_PROVIDER` | No | Force `openai` or `gemini` |

### 5. Running Services

**Development (single terminal):**

```bash
npm run dev     # Main app with hot reload
```

**Or run services separately:**

```bash
npm run bot       # Slack bot (socket mode)
npm run api       # REST API (port 3001)
npm run worker    # BullMQ background worker
npm run scheduler # Daily scrape scheduler
```

**Dashboard:**

```bash
npm run dashboard  # Next.js dashboard (port 3000)
```

## Slack App Configuration

### 1. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name it "Vesper" and select your workspace

### 2. Enable Socket Mode

1. Go to **Socket Mode** in sidebar
2. Enable Socket Mode
3. Create an app-level token with `connections:write` scope
4. Copy the `xapp-...` token → `SLACK_APP_TOKEN`

### 3. Configure Bot Token Scopes

Go to **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**:

| Scope | Purpose |
|-------|---------|
| `channels:history` | Read channel messages |
| `channels:read` | List channels |
| `chat:write` | Send messages |
| `users:read` | Get user display names |
| `app_mentions:read` | Respond to @mentions |

### 4. Enable Events

Go to **Event Subscriptions** → Enable Events:

Subscribe to bot events:
- `app_mention` - Respond when mentioned
- `message.channels` - Track messages in public channels

### 5. Install to Workspace

1. Go to **Install App**
2. Click **Install to Workspace**
3. Copy the Bot Token (`xoxb-...`) → `SLACK_BOT_TOKEN`

### 6. Get Signing Secret

Go to **Basic Information** → **App Credentials**:
- Copy **Signing Secret** → `SLACK_SIGNING_SECRET`

### 7. Invite Bot to Channels

In Slack, invite the bot to channels you want to track:

```
/invite @Vesper
```

## Deployment

### Environment

Set environment variables in your deployment platform:

```bash
DATABASE_URL=postgres://user:pass@host:5432/vesper
REDIS_URL=redis://host:6379
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
SLACK_WORKSPACE_URL=https://workspace.slack.com
GOOGLE_GENERATIVE_AI_API_KEY=...  # Or OPENAI_API_KEY
```

### Build

```bash
npm run build
```

### Run

Start these processes (use PM2, systemd, or container orchestration):

```bash
node dist/bot/index.js       # Required: Slack bot
node dist/api/server.js      # Required: REST API
node dist/jobs/worker.js     # Required: Background jobs
node dist/jobs/daily-scrape.js  # Optional: Daily scheduler
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: vesper
      POSTGRES_PASSWORD: vesper
      POSTGRES_DB: vesper
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

  bot:
    build: .
    command: node dist/bot/index.js
    env_file: .env
    depends_on: [postgres, redis]

  api:
    build: .
    command: node dist/api/server.js
    ports:
      - "3001:3001"
    env_file: .env
    depends_on: [postgres, redis]

  worker:
    build: .
    command: node dist/jobs/worker.js
    env_file: .env
    depends_on: [postgres, redis]

volumes:
  postgres_data:
  redis_data:
```

### Database Migrations (Production)

```bash
npm run db:generate   # Generate migration from schema changes
npm run db:migrate    # Apply migrations
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:integration  # Integration tests only
```

## CLI Tools

```bash
npm run cli:scrape    # Manually trigger channel scrape
npm run cli:history   # View scrape history
npm run test:query    # Test query execution
npm run db:studio     # Open Drizzle Studio GUI
```

## Troubleshooting

### Bot not responding

1. Check socket mode is enabled in Slack app settings
2. Verify `SLACK_APP_TOKEN` is an app-level token (starts with `xapp-`)
3. Check bot is invited to the channel

### Database connection failed

```bash
npm run db:verify
```

Check `DATABASE_URL` format and that PostgreSQL is running.

### LLM errors

- Ensure at least one of `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` is set
- Gemini is preferred (cheaper) - set `GOOGLE_GENERATIVE_AI_API_KEY`
- Force provider with `LLM_PROVIDER=gemini` or `LLM_PROVIDER=openai`

### Redis connection failed

Check `REDIS_URL` and that Redis is running:

```bash
redis-cli ping  # Should return PONG
```
