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
- **14 specialized AI agents** for different tasks (build, plan, review, docs, legal, etc.)
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
├── storage/       # Runtime data (logs, models, temp)
├── tests/         # pytest suite
├── docs/          # Documentation (en/it)
├── .opencode/     # OpenCode agent configuration
└── run.ps1/.sh    # Launcher scripts
```

## Plugins

The bot uses OpenCode with three plugins installed:

| Plugin | Purpose |
|--------|---------|
| `superpowers` | Enhanced AI capabilities and tools |
| `@asidorenko/openslimedit` | Efficient file editing operations |
| `agents-opencode` | Multi-agent orchestration system |

## Available Agents

| Agent | Model | Use Case |
|-------|-------|----------|
| `build` | deepseek-v4-flash | Build new features and code |
| `plan` | glm-5.1 | Architecture and implementation planning |
| `explore` | deepseek-v4-flash | Explore and understand codebases |
| `scout` | qwen3.6-plus | Find specific files and patterns |
| `orchestrator` | kimi-k2.6 | Coordinate complex multi-step tasks |
| `planner` | glm-5.1 | Create detailed implementation plans |
| `codebase` | kimi-k2.6 | Modify and extend existing code |
| `review` | glm-5.1 | Code review and security analysis |
| `docs` | qwen3.5-plus | Generate documentation |
| `em-advisor` | qwen3.6-plus | Engineering management advice |
| `blogger` | qwen3.5-plus | Write blog posts and content |
| `brutal-critic` | glm-5.1 | Critical review and feedback |
| `legal-advisor` | glm-5.1 | Legal and compliance guidance |
| `file-parser` | kimi-k2.6 | Analyze images, documents, video |

## Use Case Examples

| Task | Example Prompt |
|------|----------------|
| Build a CLI tool | "Build a new Python CLI tool for task management" |
| Plan architecture | "Plan the architecture for a microservice that processes invoices" |
| Explore codebase | "Explore this codebase and tell me how authentication works" |
| Find files | "Find all files related to database configuration" |
| Coordinate refactoring | "I need to refactor my bot handlers - coordinate the full plan" |
| Implementation plan | "Create a detailed implementation plan for adding user authentication" |
| Add new feature | "Add a new command handler for /stats that shows usage statistics" |
| Code review | "Review this pull request for security issues" |
| Generate docs | "Generate API documentation for the OpenCode client module" |
| Engineering advice | "What's the best way to structure a Python async project?" |
| Write blog post | "Write a blog post about how I built this Telegram AI bot" |
| Critique README | "Critique my project README and suggest improvements" |
| Legal questions | "What licenses should I consider for an open source AI tool?" |
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
