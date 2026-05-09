# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Telegram Bot                         │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌────────────────────┐  │
│  │  CLI     │──▶│ Bootstrap│──▶│  PTB Application   │  │
│  │  (check, │   │ (checks, │   │  (handlers, auth)  │  │
│  │  setup,  │   │  cleanup) │   └───────┬────────────┘  │
│  │  start,  │   └──────────┘           │                │
│  │  test)   │                          │                │
│  └──────────┘          ┌───────────────┼──────────┐     │
│                        │  BotHandlers   │          │     │
│                        │ ┌─────────────┴──────┐   │     │
│                        │ │  CommandHandler    │   │     │
│                        │ │  (start, help,     │   │     │
│                        │ │   new, status,     │   │     │
│                        │ │   restart)         │   │     │
│                        │ ├────────────────────┤   │     │
│                        │ │  MessageHandlers   │   │     │
│                        │ │  (text, photo,     │   │     │
│                        │ │   document, voice) │   │     │
│                        │ └────────┬───────────┘   │     │
│                        │          │               │     │
│                        │ ┌────────┴───────────┐   │     │
│                        │ │   SessionStore     │   │     │
│                        │ │   (dict in memoria) │   │     │
│                        │ └────────────────────┘   │     │
│                        └──────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐    ┌──────────────────────────┐
│  OpenCodeClient │    │    ProcessManager         │
│  (httpx)        │    │  (opencode serve subproc) │
│  - create sess  │    │  - start/stop/restart     │
│  - send msg     │    │  - health check           │
│  - delete sess  │    │  - uptime tracking        │
└────────┬────────┘    └────────────┬─────────────┘
         │                          │
         ▼                          ▼
┌──────────────────────────────────────────────┐
│              OpenCode Server                  │
│           (http://127.0.0.1:4096)             │
└──────────────────────────────────────────────┘

┌──────────────────┐
│  VoiceTranscriber │
│  (faster-whisper) │
│  - model "small"  │
│  - CPU, int8      │
│  - HF_HOME cache  │
│    in storage/    │
└──────────────────┘
```

## Component Breakdown

### `src/config.py`
Immutable `Config` dataclass loaded from environment variables. Validates token format (`\d+:[A-Za-z0-9_-]+`), parses integers, applies defaults.

### `src/security.py`
- `safe_path(filename, base_dir)` — resolves path and blocks traversal
- `is_sensitive(filename)` — checks against blocklist of sensitive file patterns

### `src/bootstrap.py`
Pre-flight checks at startup:
- Python 3.12+ validation
- `.env` file existence
- Config loading and validation
- `opencode` command in PATH
- Storage directory creation
- Temp file cleanup (>1h old)

### `src/cli.py`
Argparse-based CLI with subcommands:
- `check` — run bootstrap validation
- `setup` — create `.env` and storage dirs
- `start` — launch bot
- `test` — run pytest with coverage

### `src/bot/app.py`
PTB Application setup:
- Auth middleware checking `ALLOWED_CHAT_ID`
- Registration of all command and message handlers
- Graceful shutdown support

### `src/bot/handlers.py`
All bot logic:
- 5 commands: `/start`, `/help`, `/new`, `/status`, `/restart`
- 4 message types: text, photo, document, voice
- Typing indicator during processing
- Error handling with user-facing messages

### `src/bot/session.py`
In-memory session store (`dict[int, str]`). No persistence.

### `src/bot/utils.py`
- `send_reply()` — splits messages >4096 characters
- Handles `[SEND_FILE:path]` markers in responses

### `src/opencode/client.py`
Async HTTP client for OpenCode API:
- `create_session(title, project_dir)` → POST `/session`
- `send_message(session_id, text)` → POST `/session/{id}/message`
- `delete_session(session_id)` → DELETE `/session/{id}`
- Basic Auth support

### `src/process/manager.py`
Async subprocess manager:
- `start()` — spawns `opencode serve`, waits 5s, health check
- `stop()` — SIGTERM → 5s timeout → SIGKILL
- `restart()` — stop + start
- `is_healthy()` — GET `/global/health`

### `src/voice/transcriber.py`
- Lazy-init `faster_whisper.WhisperModel("small", cpu, int8)`
- `HF_HOME` forced to `storage/models/`
- `transcribe(file_path, language)` → str

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| In-memory sessions | Restart = fresh state. No file I/O. Simpler. |
| Local voice transcription | Privacy. No cloud dependency. |
| `PYTHONPATH=src` | Avoid `pip install -e .`. Simpler packaging. |
| `safe_path()` on all writes | Defense against malicious filenames. |
| Auto-cleanup temp | Prevent disk fill from large files. |
| Single user (ALLOWED_CHAT_ID) | Bot is a personal mobile interface. |
