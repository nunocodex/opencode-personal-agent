# Project rules

Stack: Python 3.12+ async, ruff, pytest. Coverage minima 84%.

## Hard rules
1. Voice module must not import cloud SDKs. Only faster-whisper.
2. Every Telegram handler verifies the allowed chat id before any action.
3. User-derived paths go through the shared path validation function.
4. Sensitive file blocklist (.env, *.key, *.pem) enforced on all download paths.
5. No tokens, chat ids, or user paths in INFO/DEBUG logs.

## Module map
- src/bot/ — Telegram handlers
- src/opencode/ — HTTP client for opencode serve
- src/process/ — subprocess lifecycle
- src/voice/ — local transcriber
- src/config.py — env validation
- src/cli.py — setup/check/start

## Commands
- Lint: ruff check src/ && ruff format src/
- Test: pytest tests/ --cov=src -v
