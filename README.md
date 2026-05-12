# OpenCode Agents — Telegram Bot

[![Python](https://img.shields.io/badge/python-3.12%2B-blue)](https://www.python.org/) [![Code style: ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Telegram bot interface for [OpenCode](https://opencode.ai). Receive messages on Telegram, forward to OpenCode agents, get responses back.

## Features

- **5 commands:** `/start`, `/help`, `/new`, `/status`, `/restart`
- **4 message types:** text, photo, document, voice
- **100% local voice transcription** via `faster-whisper` (CPU, int8)
- **Async process lifecycle** — start/stop/restart `opencode serve`
- **Security-first** — path traversal protection, sensitive file blocklist, single-user auth
- **68 tests, 84% coverage**
- **10 specialized AI agents** for different tasks (build, plan, review, docs, explore, etc.)
- **20+ skills** for language-specific guidance (Python, React, Flutter, Go, Rust, etc.)

## Quick Start

```bash
cp .env.example .env                              # Configure your bot
python -m venv .venv && .venv\Scripts\pip install -r requirements.txt
python -m src.cli setup && python -m src.cli check && python -m src.cli start
```

## Documentation

| English | Italiano |
|---------|----------|
| [Full Documentation](docs/en/README.md) | [Documentazione Completa](docs/it/README.md) |
| [Setup Guide](docs/en/setup.md) | [Guida Setup](docs/it/setup.md) |
| [Usage Guide](docs/en/usage.md) | [Guida Utilizzo](docs/it/usage.md) |
| [Security](docs/en/security.md) | [Sicurezza](docs/it/security.md) |
| [Architecture](docs/en/architecture.md) | [Architettura](docs/it/architecture.md) |
| [Agents & Skills](docs/en/agents.md) | [Agenti & Skill](docs/it/agents.md) |

## Project Structure

```
opencode-personal-agent/
├── src/           # Python source code
│   ├── main.py    # Entry point
│   ├── cli.py     # CLI commands
│   ├── config.py  # Config validation
│   ├── bot/       # Telegram bot handlers
│   ├── opencode/  # OpenCode HTTP client
│   ├── process/   # Process manager
│   └── voice/     # Voice transcriber
├── storage/       # Runtime data (logs, models, temp, uploads)
├── tests/         # pytest suite
├── docs/          # Documentation (en/it)
├── .opencode/     # OpenCode agent configuration
└── run.ps1/.sh    # Launcher scripts
```

## Plugins

The bot uses OpenCode with two plugins installed:

| Plugin | Purpose |
|--------|---------|
| `superpowers` | Enhanced AI capabilities and tools |
| `@asidorenko/openslimedit` | Efficient file editing operations |

## Available Agents

| Agent | Model | Use Case |
|-------|-------|----------|
| `build` | deepseek-v4-flash | Build new features and code (default) |
| `plan` | glm-5.1 | Standard architecture and implementation planning |
| `plan-opus` | glm-5.1 | Deep planning for complex systems |
| `plan-haiku` | deepseek-v4-flash | Quick implementation sketches |
| `explore` | deepseek-v4-flash | Explore and understand codebases |
| `debug` | glm-5.1 | Systematic debugging and root cause analysis |
| `review` | glm-5.1 | Code review and security analysis |
| `docs` | deepseek-v4-flash | Generate documentation |
| `file-parser` | kimi-k2.6 | Analyze images, documents, video |
| `general` | deepseek-v4-flash | General-purpose research and multi-step tasks |

## Use Case Examples

| Task | Example Prompt |
|------|----------------|
| Build a CLI tool | "Build a new Python CLI tool for task management" |
| Plan architecture | "Plan the architecture for a microservice that processes invoices" |
| Explore codebase | "Explore this codebase and tell me how authentication works" |
| Debug an issue | "Investigate why the bot crashes on voice messages" |
| Code review | "Review this pull request for security issues" |
| Generate docs | "Generate API documentation for the OpenCode client module" |
| Analyze image | Send a photo and ask "Analyze this image and describe its contents" |

## Testing

```bash
pytest tests/ --cov=src -v
```

## Security

- Single-user access via `ALLOWED_CHAT_ID`
- Path traversal prevention on all file operations
- Sensitive file download blocklist
- Voice transcription is 100% local — no cloud APIs
- Temp files auto-cleaned at startup

## License

MIT
