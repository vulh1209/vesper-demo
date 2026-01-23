# Domain Pitfalls

**Domain:** Slack-integrated asset version tracking with AI summarization
**Researched:** 2026-01-23
**Confidence:** HIGH (verified via official Slack docs, research studies, and documented incidents)

---

## Critical Pitfalls

Mistakes that cause rewrites, major issues, or project failure.

---

### Pitfall 1: Rate Limit Strangulation (Non-Marketplace Apps)

**What goes wrong:**
Starting May 29, 2025, non-Marketplace Slack apps face severe rate limits on `conversations.history` and `conversations.replies` - down to **1 request per minute** with a max of 15 objects per request. Your daily batch job that worked fine in dev breaks catastrophically in production when scraping multiple channels.

**Why it happens:**
Slack changed policy to push apps toward Marketplace approval. Internal/custom apps are exempt, but only if properly categorized. Many teams build "internal" apps that Slack classifies as "commercially distributed" because they didn't configure app settings correctly.

**Consequences:**
- Daily scraping jobs time out or take hours instead of minutes
- Incomplete data collection leads to missed asset updates
- Users lose trust when "latest version" is actually days old

**Warning signs:**
- HTTP 429 errors in logs
- Jobs taking 10x longer than expected
- Inconsistent data between runs
- `Retry-After` headers appearing frequently

**Prevention:**
1. **Verify app classification**: Ensure your app is registered as "Custom App" (internal) not "Commercially Distributed"
2. **Design for worst-case limits**: Assume 1 req/min, 15 objects. Build job duration estimates accordingly
3. **Implement exponential backoff**: Never retry immediately after 429
4. **Cache aggressively**: Store messages locally, only fetch new ones using `oldest` parameter
5. **Consider Marketplace approval**: Even for internal apps, Marketplace approval removes limits (Slack doesn't charge for it)

**Phase to address:** Phase 1 (Slack Integration) - Must validate app classification before any development

**Sources:**
- [Slack Rate Limit Changes May 2025](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/)
- [Slack Rate Limits Documentation](https://docs.slack.dev/apis/web-api/rate-limits/)

---

### Pitfall 2: AI Summarization Hallucination (45% Error Rate)

**What goes wrong:**
A major 2025 EBU study across 22 media organizations found **45% of AI-generated summaries contained at least one significant error**. When your system hallucinates an asset version ("character_rig_v15" when the actual version is "v14"), teams use the wrong asset and blame the tool.

**Why it happens:**
LLMs prioritize fluency over factuality. They "fill gaps" with plausible-sounding information. Version numbers, dates, and asset names are especially vulnerable because they're arbitrary strings with no semantic meaning the model can verify.

**Consequences:**
- Teams use wrong asset versions (the exact problem you're trying to solve)
- Loss of trust = abandoned tool
- Worst case: shipped game with wrong assets

**Warning signs:**
- Users reporting "the bot said X but I checked and it's actually Y"
- Discrepancies between AI summary and source messages
- Confident-sounding summaries for sparse source data

**Prevention:**
1. **Extract before summarizing**: Use regex/pattern matching to extract version numbers FIRST, then have AI summarize context around verified extractions
2. **Always cite sources**: Every version claim must link to the original Slack message
3. **Human-in-the-loop for critical paths**: Flag low-confidence extractions for human verification
4. **Teach the model to say "unclear"**: Prompt engineering to express uncertainty rather than guess
5. **Validate against naming conventions**: If team uses `assetname_vN` pattern, validate extracted versions match pattern

**Phase to address:** Phase 3 (AI Summarization) - Core architecture decision, not a polish item

**Sources:**
- [EBU AI Summarization Study](https://www.tvtechnology.com/news/major-study-finds-high-levels-of-mistakes-in-ai-generated-news-summaries)
- [Northwestern AI Summarization Dilemma](https://casmi.northwestern.edu/news/articles/2024/the-ai-summarization-dilemma-when-good-enough-isnt-enough.html)

---

### Pitfall 3: Token Rotation Trap (Irreversible Decision)

**What goes wrong:**
You enable token rotation for "better security" without realizing: **once enabled, it cannot be disabled**. Your tokens now expire every 12 hours. If your refresh logic has any bugs, your entire integration goes dark and users must re-authorize.

**Why it happens:**
Token rotation is presented as a security best practice (it is), but the documentation buries the "irreversible" warning. Teams enable it in production without testing refresh flows thoroughly.

**Consequences:**
- Integration dies every 12 hours until refresh is fixed
- Users must re-install the app if refresh fails
- Weekend/holiday outages when no one notices tokens expired

**Warning signs:**
- `token_expired` errors appearing suddenly
- Integration works for hours then mysteriously stops
- `invalid_refresh_token` errors (refresh tokens can expire in 3-4 hours in some cases)

**Prevention:**
1. **Test in dev environment first**: Create a separate dev app with rotation enabled
2. **Use Bolt framework**: Token rotation is handled automatically by Bolt for Python/JS/Java
3. **If not using Bolt**: Implement proactive refresh (refresh at 11 hours, not when expired)
4. **Monitor token health**: Alert when token refresh fails, not when API calls fail
5. **Document the decision**: If you choose NOT to enable rotation, document why (it's a valid choice for internal apps)

**Phase to address:** Phase 1 (Slack Integration) - Decide before first OAuth implementation

**Sources:**
- [Slack Token Rotation Documentation](https://docs.slack.dev/authentication/using-token-rotation/)
- [Slack Token Types](https://api.slack.com/concepts/token-types)

---

### Pitfall 4: Pagination Data Loss (Silent Failures)

**What goes wrong:**
Your scraping job "completes successfully" but misses 30% of messages because:
1. You checked `len(results) < limit` to determine completion (wrong)
2. Cursor expired mid-job (you paused too long)
3. New messages arrived during pagination (offset-style thinking)

**Why it happens:**
Developers expect pagination to work like SQL `OFFSET/LIMIT`. Slack's cursor-based pagination has different semantics. The documentation explicitly warns: "It's possible to receive fewer results than your specified limit, even when there are additional results."

**Consequences:**
- Missing asset updates (the tool's core value proposition fails)
- Intermittent issues that are hard to reproduce
- Users see different "latest versions" than what's in Slack

**Warning signs:**
- Scraping results vary between runs for same time range
- `invalid_cursor` errors appearing
- Jobs completing faster than expected
- Users reporting "I posted an update but it's not showing"

**Prevention:**
1. **ONLY check `next_cursor`**: Empty/null/missing `next_cursor` = done. Never check result count.
2. **Don't persist cursors**: Use them within a job, not across days
3. **Use time-based anchoring**: Store `latest` timestamp from last successful job, use as `oldest` for next job
4. **Idempotent processing**: If you see the same message twice, dedupe by `ts` (timestamp is the unique ID)
5. **Verify completeness**: After job, spot-check that recent messages in Slack appear in your data

**Phase to address:** Phase 1 (Slack Integration) - Foundational data collection logic

**Sources:**
- [Slack Pagination Documentation](https://docs.slack.dev/apis/web-api/pagination/)
- [Slack Engineering: Evolving API Pagination](https://slack.engineering/evolving-api-pagination-at-slack/)

---

### Pitfall 5: IT Approval Stall (Scope Creep Rejection)

**What goes wrong:**
IT approves your app with minimal scopes. Later, you need `channels:history` for a new channel type, or `users:read` for better user context. IT treats this as a **new review**, taking weeks. Meanwhile, the product is half-functional.

**Why it happens:**
Enterprise Slack instances require app approval. IT teams categorize permission scopes as high/medium/low risk. Each scope change triggers review. Your "agile iteration" hits a compliance wall.

**Consequences:**
- Features blocked for weeks on approval
- Pressure to launch with reduced functionality
- Political friction with IT ("why didn't you ask for this initially?")

**Warning signs:**
- IT asking detailed questions about each requested scope
- Multiple rounds of scope justification
- Being asked "can you do this without X permission?"

**Prevention:**
1. **Request all needed scopes upfront**: Even if you don't use them in v1, get approval for the full roadmap
2. **Document business justification**: For each scope, write 1-sentence justification before meeting with IT
3. **Reference Slack's own documentation**: Link to official docs showing why scope is needed
4. **Build IT relationship early**: Include IT in planning, not just approval gate
5. **Have a fallback plan**: Know which features can launch without which scopes

**Scopes you likely need (request all at once):**
- `channels:history`, `channels:read` (public channels)
- `groups:history`, `groups:read` (private channels, if needed)
- `chat:write` (bot responses)
- `commands` (slash commands, if any)
- `users:read` (map user IDs to names)

**Phase to address:** Phase 0 (Pre-development) - Get approval before writing code

**Sources:**
- [Slack Security Recommendations for Approving Apps](https://slack.com/help/articles/360001670528-Security-recommendations-for-approving-apps)
- [Slack App Approval Automation Rules](https://slack.com/help/articles/9978438318227-Guide-to-automation-rules-for-app-approval)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded experience.

---

### Pitfall 6: LLM Entity Extraction Brittleness

**What goes wrong:**
Your LLM extracts "character_rig_v14" correctly 95% of the time. But a typo, unusual punctuation, or message format variation causes it to extract "character_rig_v4" or hallucinate "character_rig_final_v14_FIXED". The 5% failures erode trust.

**Why it happens:**
Research shows LLM entity extraction is "massively more brittle and unpredictable than traditional extractors." A single apostrophe can change extraction results for unrelated entities in the same text.

**Prevention:**
1. **Hybrid approach**: Regex for structured patterns (version numbers), LLM for context/interpretation
2. **Validate against conventions**: If naming convention is `asset_vN`, reject extractions that don't match
3. **Confidence scoring**: Output confidence with each extraction, flag low-confidence for review
4. **Fuzzy matching to known assets**: Compare extracted names against known asset list

**Phase to address:** Phase 3 (AI Summarization)

**Sources:**
- [GDELT LLM Entity Extraction Experiments](https://blog.gdeltproject.org/experiments-in-entity-extraction-using-llms-hallucination-how-a-single-apostrophe-can-change-the-results/)

---

### Pitfall 7: "Latest Version" Semantic Ambiguity

**What goes wrong:**
Alice posts "uploaded character_rig_v15". Bob replies "v15 has issues, use v14 for now". Your system shows "v15" as latest because it was mentioned most recently. Teams use buggy v15.

**Why it happens:**
"Latest" has multiple meanings: most recently uploaded, most recently discussed, or currently recommended. Your system picks one definition; users assume another.

**Prevention:**
1. **Define "latest" explicitly**: "Latest uploaded" vs "Latest approved" - pick one and document
2. **Support status markers**: If someone says "don't use" or "broken", flag the version
3. **Show context, not just version**: Display the message context so users can judge
4. **Consider explicit approval workflow**: "Latest" only updates when someone explicitly marks a version as current

**Phase to address:** Phase 3 (AI Summarization) - Requires semantic design decisions

---

### Pitfall 8: Dashboard-Slack Desync

**What goes wrong:**
The web dashboard shows "v15" but when users ask the Slack bot, it says "v14". Or vice versa. Different data sources, different cache invalidation, different update times.

**Why it happens:**
Dashboard and bot often have separate data access layers. One might cache, one might not. One might run on different schedules. Without a single source of truth, they drift.

**Prevention:**
1. **Single data store**: Both dashboard and bot read from the same database
2. **Single processing pipeline**: One job processes Slack data, writes to one place
3. **Show "as of" timestamps**: Dashboard and bot both show when data was last updated
4. **Cache invalidation strategy**: If caching, invalidate both when source updates

**Phase to address:** Phase 4 (Dashboard) - Architecture decision at design time

---

### Pitfall 9: Natural Language Query Scope Creep

**What goes wrong:**
You build NL queries for "what's the latest version of character_rig?" Works great. Users start asking "who worked on character rigs last month?" and "compare v14 vs v15 changes". Your simple intent classifier breaks down.

**Why it happens:**
Natural language interfaces invite open-ended questions. Users don't know (or care about) system limitations. Each new question type requires new handling.

**Prevention:**
1. **Constrain initial scope**: v1 answers ONLY "what's the latest version of X?"
2. **Graceful degradation**: "I can tell you the latest version. For history, check the dashboard."
3. **Suggest valid queries**: When confused, show examples of what it CAN answer
4. **Track failed queries**: Log queries that didn't match intents, review for v2 priorities

**Phase to address:** Phase 5 (Slack Bot NL Interface) - Scope definition before implementation

---

### Pitfall 10: Private Channel Permission Assumptions

**What goes wrong:**
Your app works perfectly on public channels. Then a team wants to track assets in a private channel. Your app can't see it, even though it's "installed" in the workspace.

**Why it happens:**
Private channels require explicit bot invitation. Having workspace-level scopes doesn't grant access to private channels. Users don't understand this distinction.

**Prevention:**
1. **Document the limitation**: Users must `/invite @yourbot` to private channels
2. **Detect the issue**: If user asks about an asset in a channel you can't access, explain why
3. **Consider scope tradeoffs**: `groups:history` scope is needed for private channels (separate IT approval)
4. **Audit accessible channels**: Show users which channels the bot can currently see

**Phase to address:** Phase 1 (Slack Integration) - Decide public-only vs private support

---

## Integration Gotchas

Specific technical surprises when integrating components.

---

### Gotcha 1: Slack Message `ts` is Not a Timestamp

The message `ts` field looks like a Unix timestamp (`1234567890.123456`) but it's actually a **unique message ID**. The integer part IS seconds since epoch, but the decimal part is NOT milliseconds - it's a sequence number for messages in the same second. Don't do math on it; use it as a string ID.

---

### Gotcha 2: Threaded Replies Don't Appear in `conversations.history`

If someone posts asset info in a thread reply, `conversations.history` won't return it. You need `conversations.replies` with the parent message's `ts`. This doubles your API calls for threaded channels.

**Mitigation:** Detect `thread_ts` in channel messages, fetch replies separately, or use Events API to catch replies in real-time.

---

### Gotcha 3: User IDs Require Separate Resolution

Slack messages contain user IDs like `U1234567`, not display names. You need `users:read` scope and `users.info` calls to resolve them. Batch this at job start, not per-message.

---

### Gotcha 4: LLM Token Limits vs Channel Volume

A busy channel can have 1000+ messages/day. Even with smart chunking, you'll hit LLM context limits. You must summarize incrementally or pre-filter messages before LLM processing.

**Mitigation:** Filter for messages matching asset naming patterns BEFORE sending to LLM.

---

### Gotcha 5: Slack Bolt Framework vs Raw API

The Bolt framework handles token rotation, retry logic, and rate limiting automatically. Rolling your own means implementing all of that. Unless you have specific requirements, use Bolt.

---

## Performance Traps

Things that work in dev but fail at scale.

---

### Trap 1: Full Channel History on Every Run

**Temptation:** Fetch all messages, reprocess everything, ensure consistency.
**Reality:** A channel with 6 months of history = 50,000+ messages = rate limit hell.
**Solution:** Incremental fetching with `oldest` parameter set to last successful fetch timestamp.

---

### Trap 2: LLM Call Per Message

**Temptation:** Process each message through LLM for entity extraction.
**Reality:** 1000 messages x $0.01/call = $10/day/channel. Also slow.
**Solution:** Batch messages, pre-filter with regex, only LLM-process candidates.

---

### Trap 3: Real-Time Event Processing Without Queue

**Temptation:** Process each Slack event immediately as it arrives.
**Reality:** Burst of 50 messages in a minute = 50 parallel LLM calls = rate limits + cost spike.
**Solution:** Queue events, process in batches on schedule.

---

### Trap 4: Dashboard Querying Raw Data

**Temptation:** Dashboard queries Slack API or raw message store directly.
**Reality:** Slow page loads, API rate limits, inconsistent results during processing.
**Solution:** Pre-computed summary tables that dashboard queries.

---

## "Looks Done But Isn't" Checklist

Things that pass demo but fail in real use.

| Item | Looks Done | Actually Done |
|------|------------|---------------|
| Channel scraping | Fetches messages from one channel | Handles pagination, threads, rate limits, multiple channels |
| Asset extraction | Finds "character_rig_v15" in clean test message | Handles typos, varied formats, context around the mention |
| Latest version | Shows most recently mentioned version | Distinguishes "uploaded v15" from "v15 is broken" |
| NL queries | Answers "latest version of X" | Handles variations: "what version", "current", "newest", asset name typos |
| Bot responses | Sends a message | Handles rate limits, formats nicely, cites sources |
| Dashboard sync | Shows data | Shows SAME data as bot, handles concurrent updates |
| Error handling | Logs errors | Alerts on errors, recovers gracefully, shows user-friendly messages |
| Token management | Has token | Refreshes token (if rotation enabled), alerts on failure |
| Private channels | Works on test channel | Documents invitation requirement, detects inaccessible channels |
| IT approval | Got initial approval | Approved for ALL needed scopes including future phases |

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 0 (Planning) | IT approval stall | Request all scopes upfront with business justification |
| Phase 1 (Slack Integration) | Rate limit strangulation | Verify app classification, design for worst-case limits |
| Phase 1 (Slack Integration) | Pagination data loss | Only check `next_cursor`, never result count |
| Phase 1 (Slack Integration) | Token rotation trap | Decide rotation stance before OAuth implementation |
| Phase 2 (Data Pipeline) | Full history on every run | Incremental fetching with timestamp anchoring |
| Phase 3 (AI Summarization) | Hallucinated versions (45% error rate) | Extract-then-summarize, always cite sources |
| Phase 3 (AI Summarization) | Entity extraction brittleness | Hybrid regex + LLM, validate against conventions |
| Phase 4 (Dashboard) | Dashboard-Slack desync | Single data store, single processing pipeline |
| Phase 5 (NL Interface) | Scope creep | Constrain initial scope, graceful degradation for out-of-scope |

---

## Sources

### Official Documentation (HIGH confidence)
- [Slack Rate Limits](https://docs.slack.dev/apis/web-api/rate-limits/)
- [Slack Pagination](https://docs.slack.dev/apis/web-api/pagination/)
- [Slack Token Rotation](https://docs.slack.dev/authentication/using-token-rotation/)
- [Slack Security Best Practices](https://docs.slack.dev/security/)
- [Slack conversations.history](https://docs.slack.dev/reference/methods/conversations.history/)

### Research Studies (MEDIUM-HIGH confidence)
- [EBU AI Summarization Study - 45% error rate](https://www.tvtechnology.com/news/major-study-finds-high-levels-of-mistakes-in-ai-generated-news-summaries)
- [Northwestern AI Summarization Dilemma](https://casmi.northwestern.edu/news/articles/2024/the-ai-summarization-dilemma-when-good-enough-isnt-enough.html)
- [GDELT LLM Entity Extraction Experiments](https://blog.gdeltproject.org/experiments-in-entity-extraction-using-llms-hallucination-how-a-single-apostrophe-can-change-the-results/)

### Industry Analysis (MEDIUM confidence)
- [Game Development Asset Management Challenges](https://www.gamedeveloper.com/production/version-control-effective-use-issues-and-thoughts-from-a-gamedev-perspective)
- [Knowledge Management Single Source of Truth](https://checkify.com/blog/single-source-of-truth/)
