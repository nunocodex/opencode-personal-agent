# OpenCode Agents - Telegram Bot

A Telegram bot interface for [OpenCode](https://opencode.ai) — receive messages on Telegram, forward to OpenCode agents, return responses.

## Architecture

```
Telegram ──► python-telegram-bot ──► httpx ──► OpenCode Server
                  │
                  ├── ProcessManager (opencode serve lifecycle)
                  ├── VoiceTranscriber (faster-whisper locale)
                  └── SessionStore (in memoria)
```

- **Language:** Python 3.13+
- **Bot framework:** `python-telegram-bot` v21+
- **HTTP client:** `httpx`
- **Voice transcription:** `faster-whisper` (locale, CPU int8)
- **Tests:** `pytest`, `pytest-asyncio`, `respx`

## Quick Start

```bash
cp .env.example .env        # Edit with your config
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
python -m src.cli setup
python -m src.cli check
python -m src.cli start
```

## Commands

- `/start` - Welcome message
- `/help` - Available commands
- `/new` - Clear session, start fresh
- `/status` - Server status
- `/restart` - Restart OpenCode server

## Message Types

- **Text** — forwarded to OpenCode
- **Photos** — downloaded to `storage/temp/`, path sent to OpenCode
- **Documents** — downloaded to `storage/temp/`, path sent to OpenCode
- **Voice** — transcribed locally with `faster-whisper`, text forwarded

## Project Structure

```
opencode-personal-agent/
├── src/
│   ├── main.py              # Entry point
│   ├── cli.py               # CLI commands (check/setup/start/test)
│   ├── config.py            # Env var validation
│   ├── bootstrap.py         # Pre-flight checks
│   ├── security.py          # Path traversal + sensitive file guard
│   ├── bot/                 # Telegram bot logic
│   ├── opencode/            # OpenCode HTTP client
│   ├── process/             # Process manager
│   └── voice/               # Voice transcriber
├── storage/
│   ├── logs/
│   ├── models/              # HF cache for faster-whisper
│   └── temp/                # Staging downloads (auto-cleaned)
├── tests/                   # pytest suite
├── docs/                    # Documentation
└── run.ps1 / run.sh         # Launchers
```

## Key Decisions

- **No persistence** — sessions are in-memory `dict[int, str]`. Restart = fresh state.
- **No cloud APIs for voice** — 100% local with `faster-whisper` (CPU, int8).
- **Safe path handling** — `safe_path()` prevents traversal, blocks sensitive files.
- **Auto-cleanup** — `storage/temp/` cleaned at startup (files >1h old).

## Testing

```bash
python -m src.cli test
# or
pytest tests/ --cov=src
```
