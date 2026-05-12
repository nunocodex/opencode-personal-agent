# AGENTS.md — OpenCode Personal Agent (Telegram Bot)

## Project

Telegram bot that forwards messages to a local OpenCode server (`opencode serve`) and returns agent responses. Python 3.12+, async, single-user.

## Commands

```
python -m src.cli setup    # Create .env + storage dirs
python -m src.cli check    # Pre-flight validation
python -m src.cli start    # Run bot (blocking)
python -m src.cli test     # pytest with coverage
```

Or use the launcher scripts: `./run.ps1` (Windows) / `./run.sh` (Unix).

**Test a single file:** `python -m pytest tests/test_bot.py -v`
**Coverage:** `python -m pytest tests/ --cov=src -v`

## Critical Setup Facts

- **`PYTHONPATH=src`** — all modules use bare imports (`from config import ...`, not `from src.config`). The CLI and launcher scripts set this. If running modules directly, you must set it yourself.
- **`opencode` CLI must be in PATH** — bootstrap checks `shutil.which("opencode")`. The bot spawns `opencode serve` as a subprocess.
- **`.env` is required** — copy from `.env.example`. Missing vars raise `ValueError` at startup.
- **External dependency:** the OpenCode server is a separate binary, not part of this repo.

## Architecture

```
CLI → Bootstrap (checks) → main.py → PTB Bot App
                                      ├── app.py (Application setup)
                                      ├── handlers.py (commands + text)
                                      ├── media_handler.py (photo, document, voice)
                                      ├── utils.py (send_reply, auth, typing)
                                      ├── session.py (in-memory dict)
                                      ├── opencode/client.py (httpx → OpenCode API)
                                      ├── process/manager.py (opencode serve subprocess)
                                      ├── process/monitor.py (health checks + auto-restart)
                                      └── voice/transcriber.py (faster-whisper, local)
```

- **`src/bot/handlers.py`** — bot logic for 5 commands (`/start`, `/help`, `/new`, `/status`, `/restart`) and text messages.
- **`src/bot/media_handler.py`** — handles photo, document, and voice messages. Downloads files to `storage/uploads/`, delegates file analysis to the `file-parser` agent via `opencode run --agent file-parser`, and transcribes voice with faster-whisper.
- **`src/bot/utils.py`** — shared utilities: `send_reply()` (splits long messages, detects JSON), `check_auth()`, `typing_scope()` (typing indicator).
- **`src/process/manager.py`** — manages `opencode serve` lifecycle: start (5s wait + health check), stop (SIGTERM → 5s → SIGKILL), restart.
- **`src/process/monitor.py`** — background health monitor: checks Telegram API and OpenCode server every 60s. Auto-restarts `opencode serve` if unhealthy. Emits an event when Telegram is unreachable for too long, triggering polling restart in main loop.
- **`src/opencode/client.py`** — async HTTP client: create session, send message, delete session via API. Also provides `send_message_cli()` for media files, spawning `opencode run --agent file-parser` as a disposable session. Uses Basic Auth.
- **`src/voice/transcriber.py`** — lazy-init WhisperModel("small", CPU, int8). `HF_HOME` forced to `storage/models/`.
- **`src/security.py`** — `safe_path()` blocks traversal + sensitive file patterns.
- **`src/bot/session.py`** — in-memory `dict[int, str]`. No persistence. Restart = fresh state.

## Testing

- **pytest-asyncio** in `auto` mode — no `@pytest.mark.asyncio` needed on async tests.
- **respx** for HTTP mocking of the OpenCode client.
- **`tests/conftest.py`** provides `config`, `mock_update`, `mock_context` fixtures.
- Tests also set `sys.path` to `src/` independently (don't rely on env).

## Known Gotchas

- **CLI photo/document flow**: `opencode run --agent file-parser --format json` invokes the read-only agent directly. May still return raw JSON on errors — `send_reply()` detects JSON responses (starts with `{` or `[`) and sends them as plain text.
- **`file-parser` permissions**: explicitly denied (`edit: deny`, `bash: deny`, `skill: deny all`) — no file modification or command execution possible. Media files are downloaded to `storage/uploads/` and deleted after analysis.

## Storage

`storage/` subdirectories: `logs/`, `models/` (whisper cache), `temp/` (auto-cleaned >1h), `uploads/`. All gitignored except `.gitkeep` files.

## Config

`src/config.py` — frozen dataclass from env vars. Validates `TELEGRAM_BOT_TOKEN` format (`\d+:[A-Za-z0-9_-]+`). Defaults: `max_file_size=50MB`, `rate_limit_seconds=2.0`, `whisper_language=auto`.

## OpenCode Config

`.opencode/opencode.json` — default agent is `build`, model `opencode-go/deepseek-v4-flash`. 8 agents are defined (plan, build, debug, review, docs, file-parser, explore, general). Two plugins: superpowers, @asidorenko/openslimedit. Skills are auto-allowed.
