---
name: project-conventions
description: Coding rules and module structure for this project. Load when writing or modifying code in src/.
---

# Conventions

Python 3.12+, type hints with PEP 604 unions (`str | None`).
async/await for all I/O.
Style: ruff (check + format).
Tests: pytest + pytest-asyncio. Coverage target ≥ 84% on `src/`.

## Modules
- `src/bot/` — Telegram handlers
- `src/opencode/` — HTTP client for `opencode serve`
- `src/process/` — subprocess lifecycle for `opencode serve`
- `src/voice/` — faster-whisper transcriber (local only, no cloud SDKs)
- `src/config.py` — env validation
- `src/cli.py` — setup/check/start commands
- `tests/` — mirrors `src/`

## Hard rules
1. Voice module must not import cloud SDKs.
2. Every Telegram handler must check the allowed chat id before any action.
3. User-derived paths go through the shared validation function. No raw `Path()` or `open()`.
4. No tokens, chat ids, or user paths in logs at INFO/DEBUG.

After edits: `ruff check src/ && ruff format src/`.