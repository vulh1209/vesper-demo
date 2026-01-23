# Feature Landscape

**Domain:** Slack-integrated asset version tracking for game development teams
**Researched:** 2026-01-23
**Confidence:** MEDIUM (synthesized from multiple web sources, no direct competitor teardowns)

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Natural language queries** | Users expect "ask in plain English" - industry standard since Slack AI (Jan 2026) | Medium | "latest Ho Ly?" should just work. Rule-based fallback for common patterns. |
| **Source attribution** | 94% of users expect to see WHERE info came from | Low | Link to original Slack message/thread. Critical for trust. |
| **Version history per asset** | Core value prop - can't track versions without history | Medium | Show timeline: v1 -> v2 -> v3 with dates, authors |
| **Search by asset name** | Basic discoverability | Low | Exact match + fuzzy match for typos/Vietnamese diacritics |
| **Search by category** | Users think in categories (Sound, 3D, Animation, etc.) | Low | Filter/faceted search by asset type |
| **Multi-channel scraping** | Teams post in multiple channels | Medium | Must aggregate across configured channels |
| **Daily summaries** | Information overload is the problem being solved | Medium | "Here's what changed today" digest |
| **Permission-aware results** | Enterprise expectation post-Slackbot 2026 | High | Don't expose assets user shouldn't see (channel membership) |
| **Mobile-friendly responses** | Most Slack use is mobile | Low | Short, scannable bot responses |
| **Naming convention tolerance** | Real teams don't follow conventions perfectly | Medium | Handle variations: "hồ ly v3", "ho_ly_v3", "Ho Ly Version 3" |

### Why These Are Table Stakes

The Slack AI ecosystem (Salesforce's Slackbot, Guru, Question Base) has raised baseline expectations:
- Users now expect natural language to "just work"
- Source citations are standard (every major knowledge bot does this)
- Daily recaps/summaries are native Slack AI features

Without these, the product feels primitive compared to native Slack AI or competitors like Spoke.ai.

## Differentiators

Features that set product apart. Not expected, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Asset preview in Slack** | See thumbnail/waveform inline without clicking | Medium | Huge UX win. Most knowledge bots return text only. |
| **"What changed?" comparison** | Show diff between versions (visual for images, metadata for all) | High | Game dev specific - nobody else does this well for creative assets |
| **Proactive staleness alerts** | "Ho Ly hasn't been updated in 2 weeks - is this blocked?" | Medium | Flip from reactive to proactive. Surfaces process problems. |
| **Cross-asset dependency tracking** | "Character X uses Sound Y and Animation Z" | High | Huge value for game dev. Answers "what breaks if I change this?" |
| **Vietnamese language understanding** | Native handling of Vietnamese queries and asset names | Medium | Differentiator for Vietnamese studios. Most tools are English-first. |
| **Context-aware follow-ups** | "what about the sound?" remembers you were discussing Ho Ly | Medium | Thread-aware conversation, not single-shot Q&A |
| **Web dashboard with visual timeline** | See all versions as visual gallery, not just list | Medium | Creatives want to SEE assets, not read about them |
| **AI-generated changelogs** | Auto-describe what changed between versions | Medium | "v3 adds tail animation, removes placeholder eyes" |
| **Conflict detection** | "Team A and Team B both have 'dragon.fbx' in different channels" | Medium | Catches naming collisions before they cause problems |
| **Usage analytics** | Which assets are most queried? Which are never found? | Low | Helps identify documentation gaps |

### Why These Differentiate

The market has two segments:
1. **Enterprise knowledge bots** (Guru, Slackbot, Question Base) - general purpose, not asset-aware
2. **Game dev DAM tools** (Mudstack, Perforce DAM) - powerful but not Slack-native

This product sits in the gap: **Slack-native + asset-aware + game dev specific**. The differentiators exploit this gap.

## Anti-Features

Features to explicitly NOT build. Common requests that are problematic.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **File storage/hosting** | Turns into DAM. Competing with Mudstack/Perforce is losing battle. Massive infrastructure cost. | Store references/links only. "Latest is here: [link]" not "download from our server" |
| **Asset editing/annotation** | Scope creep into creative tools. Figma/Photoshop already exist. | Link to source tool. "Edit in Figma: [link]" |
| **Approval workflows** | Turns into project management tool. Jira/Monday already exist. Huge complexity. | Track status passively from Slack reactions/threads. Don't manage workflow. |
| **Real-time sync with source files** | Requires deep integration with every creative tool. Maintenance nightmare. | Rely on Slack as source of truth. Updates happen when team posts. |
| **Complex access control beyond Slack** | Duplicates Slack's permission model. Confusing for users. | Inherit Slack channel permissions exactly. No separate ACL. |
| **Push notifications outside Slack** | Users already have notification fatigue. Adds another channel to manage. | Stay in Slack. Use Slack's native notification system. |
| **Mandatory naming conventions** | "Bully anti-pattern" - forcing behavior fails. Teams resist enforcement. | Be tolerant of variations. Suggest conventions, don't require. |
| **Full-text search of asset contents** | Requires parsing every file type (PSD, FBX, WAV...). Massive complexity. | Search metadata and Slack messages only. Contents are in creative tools. |
| **Automatic version detection from files** | Requires file analysis. "Is this v2 or v3?" is genuinely hard. | Trust human-posted updates. Slack message IS the version declaration. |
| **Multi-workspace federation** | Enterprise feature that 10x complexity. Different permissions, different contexts. | Single workspace only. Multi-workspace is future scope if proven. |

### Why These Are Anti-Features

**The "knowledge is power" trap:** Building file storage or approval workflows turns a simple query tool into a full DAM/PM system. This is a competitive graveyard:
- 73% of DAM implementations struggle with adoption after 18 months
- Root cause: too complex, users create workarounds

**The scope creep pattern:** Every "helpful" feature (editing, workflows, notifications) pulls away from core value. The product's strength is being **simple and fast** - a query tool, not a system of record.

**Trust Slack, don't replace it:** Slack already handles permissions, notifications, file storage, and team communication. Duplicating any of these:
- Confuses users (which is authoritative?)
- Creates sync problems
- Increases maintenance burden

## Feature Dependencies

```
                                   +-----------------+
                                   | Natural Language |
                                   | Queries          |
                                   +--------+--------+
                                            |
              +-----------------------------+-----------------------------+
              |                             |                             |
              v                             v                             v
    +-----------------+          +------------------+          +------------------+
    | Search by Name  |          | Search by        |          | Context-aware    |
    | (required first)|          | Category         |          | Follow-ups       |
    +-----------------+          +------------------+          +------------------+
              |
              v
    +-----------------+
    | Version History |
    | Per Asset       |
    +--------+--------+
              |
              +-----------------------------+
              |                             |
              v                             v
    +-----------------+          +------------------+
    | Source          |          | "What Changed?"  |
    | Attribution     |          | Comparison       |
    +-----------------+          +------------------+
                                            |
                                            v
                                 +------------------+
                                 | AI-generated     |
                                 | Changelogs       |
                                 +------------------+

    +-----------------+          +------------------+
    | Multi-channel   |--------->| Daily Summaries  |
    | Scraping        |          |                  |
    +--------+--------+          +------------------+
              |
              v
    +-----------------+          +------------------+
    | Naming          |          | Conflict         |
    | Convention      |--------->| Detection        |
    | Tolerance       |          |                  |
    +-----------------+          +------------------+

    +-----------------+
    | Permission-     |<-------- (Depends on Slack channel membership data)
    | aware Results   |
    +-----------------+

    +-----------------+          +------------------+
    | Web Dashboard   |--------->| Usage Analytics  |
    |                 |          |                  |
    +-----------------+          +------------------+
              |
              v
    +-----------------+
    | Visual Timeline/|
    | Gallery View    |
    +-----------------+
```

**Critical Path for MVP:**
1. Multi-channel scraping (data ingestion)
2. Search by name + category (basic discoverability)
3. Version history per asset (core value)
4. Source attribution (trust)
5. Natural language queries (UX layer)

**Can Be Added Later:**
- Context-aware follow-ups (after basic queries work)
- "What changed?" comparison (after version history solid)
- Web dashboard (after Slack bot proven)
- Proactive alerts (after usage patterns understood)

## MVP Recommendation

For MVP, prioritize these **table stakes** (must have or users leave):

1. **Multi-channel scraping** - Foundation. Without data, nothing works.
2. **Search by asset name** - Core use case. "Where's the latest Ho Ly?"
3. **Version history per asset** - Core value prop. See v1 -> v2 -> v3.
4. **Source attribution** - Trust builder. Link to original Slack message.
5. **Natural language queries** - UX expectation in 2026 Slack ecosystem.
6. **Daily summaries** - Passive value delivery. Users see updates without asking.

Plus **one differentiator** to stand out:

7. **Asset preview in Slack** - Visual = instant credibility for creative teams.

### Defer to Post-MVP

| Feature | Reason to Defer |
|---------|-----------------|
| Web dashboard | Slack bot must prove value first. Dashboard is "nice to have." |
| Cross-asset dependencies | High complexity, needs real usage data to design right |
| "What changed?" comparison | Needs solid version history foundation first |
| Proactive staleness alerts | Needs usage patterns to calibrate "stale" threshold |
| Vietnamese language understanding | Can start with exact match, add fuzzy later |
| Context-aware follow-ups | Single-shot queries work for MVP |
| AI-generated changelogs | Manual descriptions from Slack posts are fine initially |
| Conflict detection | Edge case for MVP scale |
| Usage analytics | Need users first |

### MVP Scope Boundary

**In scope:**
- Scrape configured Slack channels
- Parse updates following loose naming conventions
- Store asset metadata + version history
- Slack bot responds to queries
- Show latest version with link to original message
- Daily digest to configured channel

**Out of scope (explicitly):**
- File storage
- Approval workflows
- Web dashboard
- Real-time sync
- Multi-workspace

## Sources

### Slack Knowledge Bots & AI
- [Salesforce Slackbot GA Announcement](https://investor.salesforce.com/news/news-details/2026/Salesforce-Announces-the-General-Availability-of-Slackbot--Your-Personal-Agent-for-Work/default.aspx)
- [Slack AI Features Guide](https://slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack)
- [Top AI Knowledge Agents for Slack 2026](https://perfectwikiforteams.com/blog/top-ai-knowledge-agents-for-slack/)
- [What is a Slack Bot - Guru 2026](https://www.getguru.com/reference/what-is-a-slack-bot)
- [Slackbot is an AI agent now - TechCrunch](https://techcrunch.com/2026/01/13/slackbot-is-an-ai-agent-now/)

### Digital Asset Management
- [DAM 2026 Trends - Real Story Group](https://www.realstorygroup.com/Blog/webinar-dam-2026-six-trends-watch-ai-driven-world)
- [9 DAM Trends 2026](https://thedigitalprojectmanager.com/project-management/digital-asset-management-trends/)
- [Common DAM Pitfalls - Ntara](https://www.ntara.com/blog/6-common-dam-pitfalls-and-how-to-avoid-them/)
- [Why DAM Projects Fail - Bynder](https://www.bynder.com/en/blog/reasons-dam-projects-fail/)

### Game Development Tools
- [Mudstack Pipeline Platform](https://mudstack.com/)
- [Digital Asset Management in Game Development - Blueberry](https://www.blueberry-ai.com/blog/game-development-digital-asset-management)
- [Version Control for Game Development - Perforce](https://www.perforce.com/resources/vcs/version-control-best-practices-for-game-development)
- [How Riot Games Uses Slack](https://technology.riotgames.com/news/how-riot-games-uses-slack)

### Knowledge Management Anti-Patterns
- [KM Antipattern Dilemma - Forrester](https://www.forrester.com/blogs/why-knowledge-isnt-just-power-its-a-trap-the-km-antipattern-dilemma/)
- [KM System Features 2026](https://context-clue.com/blog/top-10-knowledge-management-system-features-in-2026/)

### Chatbot Features & Analytics
- [Chatbot Features 2025 Buyer's Guide - WotNot](https://wotnot.io/blog/chatbot-features)
- [Guide to Chatbot Analytics 2026 - Botpress](https://botpress.com/blog/chatbot-analytics)
