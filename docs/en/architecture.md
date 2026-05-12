# Architecture

System architecture documentation for the OpenCode Personal Agent Telegram bot.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Telegram Bot                              │
│                                                                   │
│  ┌──────────┐    ┌──────────┐    ┌────────────────────────┐     │
│  │   CLI    │───▶│ Bootstrap│───▶│   PTB Application      │     │
│  │ (check,  │    │ (checks, │    │   (app.py)             │     │
│  │  setup,  │    │ cleanup) │    └──────────┬─────────────┘     │
│  │  start,  │    └──────────┘               │                   │
│  │  test)   │                               │                   │
│  └──────────┘    ┌──────────────────────────┼──────────┐        │
│                  │      BotHandlers          │          │        │
│                  │  ┌───────────────────────┴───────┐   │        │
│                  │  │    CommandHandler             │   │        │
│                  │  │    (start, help, new,         │   │        │
│                  │  │     status, restart)          │   │        │
│                  │  ├───────────────────────────────┤   │        │
│                  │  │    Text Handler               │   │        │
│                  │  │    (on_text)                  │   │        │
│                  │  └──────────────┬────────────────┘   │        │
│                  │                 │                    │        │
│                  │  ┌──────────────┴────────────────┐   │        │
│                  │  │    MediaHandler               │   │        │
│                  │  │    (photo, document, voice)   │   │        │
│                  │  └───────────────────────────────┘   │        │
│                  │                                      │        │
│                  │  ┌──────────────┐ ┌──────────────┐   │        │
│                  │  │ SessionStore │ │ Utils        │   │        │
│                  │  │ (dict mem)   │ │ (send_reply, │   │        │
│                  │  │              │ │  check_auth, │   │        │
│                  │  │              │ │  typing)     │   │        │
│                  │  └──────────────┘ └──────────────┘   │        │
│                  └───────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│   OpenCodeClient     │    │    ProcessManager            │
│   (httpx async)      │    │  (opencode serve subprocess) │
│   - create session   │    │  - start/stop/restart        │
│   - send message     │    │  - health check              │
│   - delete session   │    │  - uptime tracking           │
└──────────┬───────────┘    └──────────────┬───────────────┘
           │                               │
           ▼                               ▼
┌─────────────────────────────────────────────────────────┐
│                   OpenCode Server                        │
│              (http://127.0.0.1:4096)                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Agent Configuration                  │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  .opencode/opencode.json                   │  │   │
│  │  │  - default_agent: build                    │  │   │
│  │  │  - 10 agents (build, plan, review, etc.)   │  │   │
│  │  │  - model assignments per agent             │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Plugins                                   │  │   │
│  │  │  - superpowers                             │  │   │
│  │  │  - @asidorenko/openslimedit                │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Skills (auto-allowed)                     │  │   │
│  │  │  - python, react-next, flutter, go, etc.   │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  VoiceTranscriber    │
│  (faster-whisper)    │
│  - model "small"     │
│  - CPU, int8         │
│  - HF_HOME cache     │
│    in storage/       │
└──────────────────────┘
```

## Component Breakdown

### `src/config.py`

Immutable `Config` dataclass loaded from environment variables.

**Responsibilities:**
- Parse environment variables
- Validate token format (`\d+:[A-Za-z0-9_-]+`)
- Apply defaults for optional values
- Freeze configuration after load

**Configuration values:**
- `telegram_bot_token` — Required
- `allowed_chat_id` — Required
- `opencode_project_dir` — Required
- `opencode_server_url` — Required
- `opencode_server_username` — Default: `opencode`
- `opencode_server_password` — Optional
- `whisper_language` — Default: `auto`
- `max_file_size` — Default: 52428800 (50MB)
- `rate_limit_seconds` — Default: 2.0

### `src/security.py`

Security utilities for file operations.

**Functions:**
- `safe_path(filename, base_dir)` — Resolves path and blocks traversal
- `is_sensitive(filename)` — Checks against sensitive file blocklist

**Blocklist patterns:**
- `.env`, `.env.local`, `.env.*`
- `.ssh/`, `id_rsa`, `id_ed25519`, `authorized_keys`
- `.pem`, `.key`, `.p12`, `.pfx`
- `credentials`, `secrets`, `secret`, `token`
- `.aws/`, `.docker/`, `.netrc`, `.htpasswd`

### `src/bootstrap.py`

Pre-flight checks at startup.

**Checks:**
- Python 3.12+ validation
- `.env` file existence
- Config loading and validation
- `opencode` command in PATH
- Storage directory creation
- Temp file cleanup (>1h old)

### `src/cli.py`

Argparse-based CLI with subcommands.

**Commands:**
- `check` — Run bootstrap validation
- `setup` — Create `.env` and storage directories
- `start` — Launch bot
- `test` — Run pytest with coverage

### `src/bot/app.py`

PTB Application setup.

**Responsibilities:**
- Create `Application` instance with bot token
- Register all command and message handlers
- Wire up `BotHandlers` (commands + text) and `MediaHandler` (photo, document, voice)
- Configure graceful shutdown support

### `src/bot/handlers.py`

Bot logic for commands and text messages.

**Command handlers:**
- `/start` — Welcome message
- `/help` — Detailed help
- `/new` — Clear session
- `/status` — Server status
- `/restart` — Restart server

**Text message handler:**
- Forwards text to OpenCode via session API

**Features:**
- Rate limiting between messages
- Error handling with user-facing messages
- Delegates photo/document/voice to MediaHandler

### `src/bot/media_handler.py`

Handles photo, document, and voice messages.

**Handlers:**
- Photos — Download to `storage/uploads/`, send to `file-parser` agent via CLI
- Documents — Download to `storage/uploads/`, send to `file-parser` agent via CLI
- Voice — Download OGG, transcribe with VoiceTranscriber, forward text to session

**Features:**
- File size limit enforcement
- Typing indicator during processing
- Auto-cleanup of downloaded files after processing
- JSON response detection (plain text fallback for CLI responses)

### `src/bot/utils.py`

Utility functions for bot operations.

**Functions:**
- `send_reply()` — Split messages >4096 characters, quote original on first chunk
- `check_auth()` — Verify user against `ALLOWED_CHAT_ID`
- `typing_scope()` — Async context manager for typing indicator
- JSON detection — Send JSON responses as plain text

### `src/bot/session.py`

In-memory session store.

Utility functions for bot operations.

**Functions:**
- `send_reply()` — Split messages >4096 characters, quote original on first chunk
- JSON detection — Send JSON responses as plain text

### `src/opencode/client.py`

Async HTTP client for OpenCode API.

**Methods:**
- `create_session(title, project_dir)` — POST `/session`
- `send_message(session_id, text)` — POST `/session/{id}/message`
- `send_message_cli(text, file_paths)` — Spawns `opencode run --agent file-parser` CLI subprocess for media file analysis (disposable session)
- `delete_session(session_id)` — DELETE `/session/{id}`

**Features:**
- Async httpx client
- Basic Auth support
- Streaming response handling
- Event parsing (text, tool-use, errors)
- JSON stream parsing for CLI subprocess responses

### `src/process/manager.py`

Async subprocess manager for OpenCode server.

**Methods:**
- `start()` — Spawn `opencode serve`, wait 5s, health check
- `stop()` — SIGTERM → 5s timeout → SIGKILL
- `restart()` — Stop + start
- `is_healthy()` — GET `/global/health`
- `uptime()` — Track server uptime

**Health check:**
- HTTP GET to `/global/health`
- 5-second timeout
- Retry logic on startup

### `src/voice/transcriber.py`

Local voice transcription using faster-whisper.

**Features:**
- Lazy-init `WhisperModel("small", cpu=True, compute_type="int8")`
- `HF_HOME` forced to `storage/models/`
- `transcribe(file_path, language)` → str

**Model:**
- Size: ~240MB (small)
- Quantization: int8
- Execution: CPU only

### `.opencode/opencode.json`

OpenCode agent configuration.

**Structure:**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode-go/deepseek-v4-flash",
  "default_agent": "build",
  "plugin": ["superpowers", "@asidorenko/openslimedit"],
  "agent": {
    "build": { "model": "opencode-go/deepseek-v4-flash" },
    "plan": { "model": "opencode-go/glm-5.1" },
    ...
  },
  "permission": {
    "skill": { "*": "allow" }
  }
}
```

**Components:**
- **Default agent:** `build`
- **10 agents:** Each with dedicated model
- **2 plugins:** superpowers, openslimedit
- **Skills:** Auto-allowed via wildcard permission

### `.opencode/agents/`

Agent instruction files.

**Example: `file-parser.md`:**
- Specialized agent for file analysis
- Read-only permissions (no bash, no edit, no skills)
- Direct invocation via `opencode run --agent file-parser`
- Vision capabilities for images
- Document parsing for text extraction
- Structured response format

## Data Flow

### Text Message Flow

```
User → Telegram → Bot Handler → Session Store → OpenCodeClient → OpenCode Server → Agent → Response → Bot → Telegram → User
```

### Photo/Document Flow

```
User → Telegram → Bot Handler → Download to storage/uploads/ → OpenCodeClient.send_message_cli() → opencode run --agent file-parser → file-parser Agent → Response → Bot → Telegram → User
```

### Voice Message Flow

```
User → Telegram → Bot Handler → Download OGG → VoiceTranscriber → Transcription → OpenCodeClient → OpenCode Server → Agent → Response → Bot → Telegram → User
```

### Server Lifecycle

```
CLI start → Bootstrap → ProcessManager.start() → opencode serve subprocess → Health check → Bot listener → (running) → Ctrl+C → ProcessManager.stop() → SIGTERM → 5s timeout → SIGKILL → Exit
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| In-memory sessions | Restart = fresh state. No file I/O. Simpler. |
| Local voice transcription | Privacy. No cloud dependency. |
| `PYTHONPATH=src` | Avoid `pip install -e .`. Simpler packaging. |
| `safe_path()` on all writes | Defense against malicious filenames. |
| Auto-cleanup temp | Prevent disk fill from large files. |
| Single user (ALLOWED_CHAT_ID) | Bot is a personal mobile interface. |
| Agent-per-task specialization | Better results with focused agents. |
| Auto-allowed skills | Flexibility for domain-specific guidance. |
| Plugin-based architecture | Extensible AI capabilities. |
| CLI subprocess for file analysis | Disposable sessions, no permission risk to main session. |

## Integration Points

### Telegram Bot API

- **Library:** `python-telegram-bot` v21+
- **Mode:** Async (asyncio)
- **Features:** Commands, messages, photos, documents, voice

### OpenCode Server

- **Protocol:** HTTP REST API
- **Auth:** Basic Auth (optional)
- **Endpoints:** `/session`, `/session/{id}/message`, `/global/health`

### faster-whisper

- **Library:** `faster-whisper`
- **Model:** small (int8 quantized)
- **Cache:** `storage/models/` via `HF_HOME`

## Testing Architecture

### Test Structure

```
tests/
├── conftest.py          # Shared fixtures
├── test_bot.py          # Bot handler tests
├── test_client.py       # OpenCode client tests
├── test_manager.py      # Process manager tests
├── test_security.py     # Security function tests
└── test_transcriber.py  # Voice transcriber tests
```

### Testing Tools

- **pytest** — Test framework
- **pytest-asyncio** — Async test support (auto mode)
- **respx** — HTTP mocking for OpenCode client
- **pytest-cov** — Coverage reporting

### Fixtures

- `config` — Test configuration
- `mock_update` — Mocked Telegram update
- `mock_context` — Mocked callback context

## Deployment Considerations

### Local Development

- Run on localhost
- Direct file system access
- No network exposure

### Production Deployment

- Keep OpenCode server on localhost
- Use Basic Auth for server
- Restrict bot to single chat ID
- Monitor server health via `/status`

### Resource Requirements

| Component | Memory | CPU |
|-----------|--------|-----|
| Bot process | ~100MB | Low |
| OpenCode server | ~500MB | Medium |
| Whisper model | ~240MB | High (during transcription) |

## Monitoring

### Health Checks

- `/status` command — Server health and uptime
- Process manager — Automatic health monitoring
- Pre-flight checks — Startup validation

### Logging

- Bot logs — `storage/logs/`
- OpenCode server logs — Server-managed
- Temp file cleanup — Logged at startup
