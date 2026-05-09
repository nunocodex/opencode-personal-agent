# OpenCode Agents — Telegram Bot

[![Python](https://img.shields.io/badge/python-3.12%2B-blue)](https://www.python.org/) [![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Telegram bot interface for [OpenCode](https://opencode.ai). Receive messages on Telegram, forward to OpenCode agents, get responses back.

## ✨ Features

- **5 commands:** `/start`, `/help`, `/new`, `/status`, `/restart`
- **4 message types:** text, photo, document, voice
- **100% local voice transcription** via `faster-whisper` (CPU, int8)
- **Async process lifecycle** — start/stop/restart `opencode serve`
- **Security-first** — path traversal protection, sensitive file blocklist, single-user auth
- **68 tests, 84% coverage**

## 🚀 Quick Start

```bash
cp .env.example .env                              # Configure your bot
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
python -m src.cli setup && python -m src.cli check && python -m src.cli start
```

## 📖 Documentation

| English | Italiano |
|---------|----------|
| [README](docs/en/README.md) | [README](docs/it/README.md) |
| [Setup](docs/en/setup.md) | [Setup](docs/it/setup.md) |
| [Usage](docs/en/usage.md) | [Utilizzo](docs/it/usage.md) |
| [Security](docs/en/security.md) | [Sicurezza](docs/it/security.md) |
| [Architecture](docs/en/architecture.md) | [Architettura](docs/it/architecture.md) |

## 📁 Structure

```
opencode-agents/
├── src/           # Python source code
│   ├── main.py    # Entry point
│   ├── cli.py     # CLI commands
│   ├── config.py  # Config validation
│   ├── bot/       # Telegram bot handlers
│   ├── opencode/  # OpenCode HTTP client
│   ├── process/   # Process manager
│   └── voice/     # Voice transcriber
├── storage/       # Runtime data (logs, models, temp)
├── tests/         # pytest suite
├── docs/          # Documentation (en/it)
└── run.ps1/.sh    # Launcher scripts
```

## 🧪 Testing

```bash
pytest tests/ --cov=src -v
```

## 🔒 Security

- Single-user access via `ALLOWED_CHAT_ID`
- Path traversal prevention on all file operations
- Sensitive file download blocklist
- Voice transcription is 100% local — no cloud APIs
- Temp files auto-cleaned at startup

## 📄 License

MIT
