# Vesper — Slack Asset Tracker

## What This Is

A Slack-integrated asset version tracking system for game development teams. Automatically scrapes multiple Slack channels, uses AI to summarize daily updates, and provides both a Slack bot (natural language queries) and web dashboard so team members can instantly find the latest version of any asset — characters, sounds, concepts, animations, UI designs.

## Core Value

**Reduce miscommunication** — everyone on the team always knows and uses the correct/latest version of assets. No more scrolling through Slack history to find "which Hồ Ly is the newest?"

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Slack channel scraping (3-5 channels, scheduled daily)
- [ ] AI-powered summarization of daily updates
- [ ] Version extraction using team's existing naming convention
- [ ] Asset tracking across 6 categories (sound, 2D concept, 3D model, story, animation, UI)
- [ ] Slack bot for natural language queries ("Hồ ly mới nhất?")
- [ ] Web dashboard showing daily summaries and version history
- [ ] Search/browse assets by name or category

### Out of Scope

- Real-time sync (daily batch is sufficient) — keep MVP simple
- File storage/hosting — Slack already hosts files, we just track metadata
- Approval workflows — this is read-only tracking, not gatekeeping
- Mobile app — web + Slack bot covers all use cases
- Multi-workspace — single Slack workspace for now

## Context

**Team structure:**
- 10+ người trong team game development
- Nhiều departments: art (2D/3D), sound, narrative, animation, UI/UX
- Mỗi department có Slack channel riêng để post updates

**Current workflow:**
- Team post updates vào Slack channels theo naming convention có sẵn
- Khi cần tìm version mới nhất, phải scroll Slack → tốn thời gian, dễ nhầm
- Miscommunication xảy ra khi người dùng version cũ

**Asset structure:**
- Assets có tên (e.g., "Hồ Ly", "Boss Theme", "Main Menu")
- Mỗi asset có thể có versions ở nhiều categories (3D model, 2D concept, animation...)
- Team đã có naming convention khi post (e.g., "[Hồ Ly v2.1]")

**Slack access:**
- Cần IT/admin approve để tạo Slack app
- Đây là dependency cần giải quyết sớm

## Constraints

- **Slack API**: Cần IT approval để tạo Slack app — liên hệ IT sớm trong Phase 1
- **Timeline**: MVP càng sớm càng tốt — prioritize working software over perfect features
- **AI Model**: Cần LLM cho summarization và natural language understanding — OpenAI hoặc Claude API

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Slack bot + Web (not just one) | Bot cho quick queries trong workflow, Web cho browse/history | — Pending |
| Natural language queries | Team không muốn học commands, hỏi tự nhiên dễ adopt hơn | — Pending |
| Daily batch (not real-time) | Đủ cho use case, đơn giản hơn nhiều | — Pending |
| 6 categories fixed | Sound, 2D, 3D, Story, Animation, UI — covers team's needs | — Pending |

---
*Last updated: 2026-01-23 after initialization*
