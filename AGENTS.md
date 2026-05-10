# opencode-personal-agent

Single-package Python 3.12+ Telegram bot that wraps `opencode serve` as a subprocess and exposes it as a personal Telegram bot. **Not a library or framework.**

## Entry points

| Command | What it does |
|---------|-------------|
| `python -m src.cli setup` | Copy `.env.example` → `.env` (if missing), ensure `storage/{logs,models,temp}` |
| `python -m src.cli check` | Validate Python >=3.12, `.env` exists, config loads, `opencode` in PATH |
| `python -m src.cli start` | Bootstrap → start `opencode serve` subprocess → launch PTB polling |
| `python -m src.cli test` | `pytest tests/ -v --cov=src --cov-report=term-missing` |
| `.\run.ps1` (Windows) / `./run.sh` (Unix) | Handles venv activation + `PYTHONPATH=src`, then runs `src.cli` |

## PYTHONPATH requirement

`PYTHONPATH=src` is required everywhere. The run scripts set it. `cli.py` and `main.py` also insert `src/` into `sys.path` as a fallback. No `pip install -e .` is used.

## Layout

```
src/
├── cli.py              # argparse CLI (check/setup/start/test)
├── main.py             # start_bot() — bootstrap → PM → PTB app
├── config.py           # frozen dataclass from env vars
├── bootstrap.py        # pre-flight checks + temp cleanup
├── security.py         # safe_path() + is_sensitive() blocklist
├── bot/
│   ├── app.py          # PTB Application builder (5 command + 4 message handlers)
│   ├── handlers.py     # all handler logic
│   ├── session.py      # in-memory dict[chat_id, session_id]
│   └── utils.py        # send_reply() with >4096-char split
├── opencode/
│   └── client.py       # httpx client for OpenCode REST API + CLI subprocess
├── process/
│   └── manager.py      # opencode serve subprocess lifecycle
└── voice/
    └── transcriber.py  # faster-whisper (CPU, int8, "small" model)
storage/                # logs/, models/ (HF cache), temp/, uploads/
tests/                  # 12 test files, ~84% coverage
```

## Key quirks (easy to miss)

- **Config validation** rejects `TELEGRAM_BOT_TOKEN` not matching `\d+:[A-Za-z0-9_-]+`.
- **Sessions are in-memory only** — restarting the bot loses all session state. No persistence.
- **Photo handling**: downloads to `storage/uploads/` and sends `@file-parser {relative_path} {caption}` via `send_message_cli()` (spawns `opencode run` CLI subprocess, not REST API) so the message reaches the full agent context with tool access and subagent routing. File is cleaned up in the `finally` block.
- **Document handling**: same `@file-parser` + `send_message_cli()` pattern as photos.
- **Voice transcription**: first call downloads the ~500 MB `small` model to `storage/models/`. `HF_HOME` is forced there via `os.environ.setdefault` at module import time.
- **`send_reply()`** auto-splits messages at 4096 chars (Telegram limit). Only first chunk quotes the original message.
- **Auth**: single-user via `ALLOWED_CHAT_ID`. Every handler calls `_check_auth()` individually.
- **`safe_path()`** blocks both path traversal (`../../etc`) and sensitive file patterns (`.env`, `*.pem`, `id_rsa`, etc.).
- **Temp cleanup**: files >1h old in `storage/temp/` are removed at startup.
- **`/new` command**: deletes the session server-side (DELETE /session/{id}, 404 ignored) and clears local store.
- **`ProcessManager`**: waits 5 s after spawn for health check, escalates to SIGKILL after 5 s timeout. On Windows uses `CREATE_NEW_PROCESS_GROUP` + `terminate()`.

## Testing

- **pytest-asyncio** with `asyncio_mode = auto` (no `@pytest.mark.asyncio` needed).
- **HTTP mocking**: `respx` (not `httpx.MockTransport`) for `OpenCodeClient` tests.
- **Bot handler tests**: `unittest.mock.MagicMock` / `AsyncMock` for PTB objects + `ProcessManager`.
- Single file: `pytest tests/test_bot.py -v`
- No integration tests — all external calls (HTTP, subprocess, filesystem) are mocked.
- Coverage target: 84% (no formal minimum set in config, but existing coverage is tracked).

## Dependencies

| Layer | Packages |
|-------|----------|
| Runtime | `python-telegram-bot>=21`, `httpx>=0.27`, `python-dotenv>=1`, `faster-whisper>=1` |
| Dev | `pytest>=8`, `pytest-asyncio>=0.23`, `pytest-cov>=5`, `respx>=0.21` |
