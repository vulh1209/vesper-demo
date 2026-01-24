# Requirements: Vesper

**Defined:** 2026-01-23
**Core Value:** Reduce miscommunication — everyone on the team always knows and uses the correct/latest version of assets

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Ingestion

- [x] **INGEST-01**: System scrapes configured Slack channels (3-5) on daily schedule
- [x] **INGEST-02**: System parses asset updates with naming convention tolerance (hồ ly v3, ho_ly_v3, Ho Ly Version 3)

### Search & Query

- [x] **QUERY-01**: User can search assets by name (exact + fuzzy match)
- [x] **QUERY-02**: User can filter assets by category (Sound, 3D, 2D, Animation, UI, Story)
- [x] **QUERY-03**: User can ask natural language queries ("Hồ ly mới nhất?")
- [x] **QUERY-04**: Bot understands Vietnamese queries and asset names

### Version Tracking

- [x] **VERSION-01**: User can view version history per asset (timeline v1 → v2 → v3 with dates, authors)
- [x] **VERSION-02**: Each result shows source attribution (link to original Slack message)

### Interfaces

- [x] **UI-01**: Slack bot responds to queries in Slack
- [x] **UI-02**: Web dashboard shows asset versions and history

### LLM Provider

- [x] **LLM-01**: System supports multiple LLM providers (OpenAI, Gemini) with automatic fallback

### Admin

- [x] **ADMIN-01**: Admin can add/remove Slack channels to track via web UI
- [x] **ADMIN-02**: Admin can view system health (job queue status, sync status, health checks)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Summaries & Alerts

- **SUMMARY-01**: Daily summaries posted to configured channel
- **SUMMARY-02**: Staleness alerts for assets not updated in X days
- **ALERT-01**: Conflict detection for naming collisions across channels

### Enhanced Features

- **DIFF-01**: What changed comparison between versions
- **PREVIEW-01**: Asset preview in Slack (thumbnail/waveform inline)
- **ANALYTICS-01**: Usage analytics (which assets are most queried)
- **CONTEXT-01**: Context-aware follow-ups (remembers previous query context)
- **CHANGELOG-01**: AI-generated changelogs between versions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| File storage/hosting | Store references only. Competing with Mudstack/Perforce is losing battle. |
| Asset editing/annotation | Scope creep into creative tools. Figma/Photoshop already exist. |
| Approval workflows | Turns into PM tool. Jira/Monday already exist. Huge complexity. |
| Real-time sync | Daily batch is sufficient. Simpler, avoids rate limit issues. |
| Push notifications outside Slack | Stay in Slack. Users already have notification fatigue. |
| Mandatory naming conventions | Be tolerant of variations. Teams resist enforcement. |
| Multi-workspace federation | Single workspace only. 10x complexity for edge case. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INGEST-01 | Phase 1 | Complete |
| INGEST-02 | Phase 1 | Complete |
| VERSION-01 | Phase 1 | Complete |
| VERSION-02 | Phase 1 | Complete |
| QUERY-01 | Phase 2 | Complete |
| QUERY-02 | Phase 2 | Complete |
| QUERY-03 | Phase 2 | Complete |
| QUERY-04 | Phase 2 | Complete |
| UI-01 | Phase 3 | Complete |
| UI-02 | Phase 3 | Complete |
| LLM-01 | Phase 4 | Complete |
| ADMIN-01 | Phase 5 | Complete |
| ADMIN-02 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-24 — Phase 5 requirements complete*
