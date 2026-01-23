# Vesper

## What This Is

An AI-powered audio asset search engine for managing a massive personal audio library (100k+ files). It analyzes audio content using local AI models on Apple Silicon, builds a semantic index, and enables natural language search — so searching "rain" finds files containing rain sounds regardless of cryptic filenames like `aa.mp3`.

## Core Value

**Fast, semantic search across audio files by what they contain, not what they're named.**

If the filenames are meaningless but you can describe what you're looking for ("birds chirping", "ambient rain", "upbeat music"), Vesper finds it.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] System analyzes audio files to detect content (sounds, music type, speech)
- [ ] System builds searchable index mapping detected content to files
- [ ] User can search by natural language description
- [ ] User can preview/play audio files from search results
- [ ] User can open file location in Finder
- [ ] User can edit metadata/tags for files
- [ ] System handles 100k+ files efficiently
- [ ] AI analysis runs locally on Apple Silicon (no cloud APIs)
- [ ] System incrementally indexes new files without full re-scan

### Out of Scope

- Multi-user/team features — personal tool only
- Cloud hosting — runs locally
- Mobile app — desktop/web only
- Real-time transcription — batch indexing is fine
- Audio editing — this is search, not a DAW

## Context

**The problem:** Audio asset libraries accumulate files with cryptic, inconsistent naming. Windows/Finder search only matches filenames. Finding "that rain sound" means manually listening through files or maintaining spreadsheets. This doesn't scale to 100k+ files.

**The solution:** AI audio analysis (audio classification, sound event detection) can identify what's in each file. Combined with vector/semantic search, users can query by description and find relevant files instantly.

**Technical environment:**
- macOS with Apple Silicon (M1/M2/M3)
- Local-first architecture — no cloud dependencies
- Large file count requires efficient indexing and search

## Constraints

- **Hardware**: Must run efficiently on Apple Silicon with 8-16GB unified memory
- **Privacy**: All processing local — audio files never leave the machine
- **Scale**: Must handle 100k+ files without degrading search performance
- **Incremental**: Adding new files shouldn't require re-indexing everything

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local AI vs Cloud API | User wants no cloud dependencies, has Apple Silicon | — Pending |
| Web UI vs Desktop app | Web is simpler, works in any browser, no app packaging | — Pending |

---
*Last updated: 2026-01-23 after initialization*
