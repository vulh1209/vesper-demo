# Vesper

Slack-integrated asset version tracking system for game development teams.

Vesper automatically scrapes Slack channels for asset updates, extracts version information using AI, and provides natural language queries via a Slack bot and REST API.

## Features

- **Automatic Version Tracking** - Scrapes Slack channels and extracts versions from messages like "Ho Ly v3" or "character_rig_v14_final"
- **Natural Language Queries** - Ask in Vietnamese or English: "phiên bản mới nhất của Hồ Ly?" or "latest version of Ho Ly?"
- **Fuzzy Search** - PostgreSQL trigram matching finds assets even with typos
- **Category Filtering** - Filter by: sound, 3d, 2d, animation, ui, story
- **REST API** - Full API for dashboard integration
- **Version History** - Track all versions with links back to original Slack messages

## How It Works

```
Slack Messages → AI Parser → PostgreSQL → Search (Bot/API/Dashboard)
```

1. **Scraper** fetches messages from configured Slack channels
2. **Parser** extracts asset names and versions using regex patterns
3. **Tracker** stores versions with deduplication and latest-version denormalization
4. **Bot/API** provides search via natural language or structured queries

## Quick Start

```bash
# Install
npm install
cp .env.example .env

# Configure .env with your Slack app credentials and database

# Database
docker run -d --name vesper-postgres -p 5432:5432 \
  -e POSTGRES_USER=vesper -e POSTGRES_PASSWORD=vesper -e POSTGRES_DB=vesper \
  postgres:16

docker run -d --name vesper-redis -p 6379:6379 redis:7

npm run db:push

# Run
npm run bot
```

See [SETUP.md](SETUP.md) for complete setup instructions including Slack app configuration.

## Usage

### Slack Bot

Mention the bot in any channel:

```
@Vesper phiên bản mới nhất của Hồ Ly?
@Vesper list all 3d assets
@Vesper search dragon
```

### API

```bash
# Search assets
curl "http://localhost:3001/api/assets?q=ho+ly"

# Get asset detail
curl "http://localhost:3001/api/assets/:id"

# List by category
curl "http://localhost:3001/api/assets?category=3d"
```

## Commands

```bash
npm run dev        # Development with hot reload
npm run bot        # Slack bot
npm run api        # REST API server
npm run worker     # Background job processor
npm run dashboard  # Web dashboard

npm run cli:scrape   # Manual scrape
npm run db:studio    # Database GUI
npm test             # Run tests
```

## Version Patterns

Vesper recognizes these patterns:

| Pattern | Example | Extracted |
|---------|---------|-----------|
| v-prefix | "Ho Ly v3" | ho ly → v3 |
| version-word | "Dragon ver 2" | dragon → v2 |
| underscore | "char_rig_v14" | char rig → v14 |
| hash | "asset #5" | asset → v5 |
| parentheses | "model (v2)" | model → v2 |

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Database**: PostgreSQL (Drizzle ORM) + pg_trgm for fuzzy search
- **Queue**: Redis + BullMQ
- **Bot**: Slack Bolt (socket mode)
- **API**: Hono
- **AI**: Gemini (primary) / OpenAI (fallback)

## License

ISC
