# OpenCode Agents — Telegram Bot Documentation

Complete documentation for the OpenCode Personal Agent Telegram bot — a mobile interface for AI-powered development assistance.

## Overview

This Telegram bot forwards your messages to a local OpenCode server and returns AI agent responses. It supports text, photos, documents, and voice messages, with 100% local voice transcription.

### Key Features

- **5 bot commands** for session and server management
- **4 message types**: text, photo, document, voice
- **8 specialized AI agents** for different tasks
- **20+ skills** for language-specific and domain-specific guidance
- **2 OpenCode plugins** for enhanced capabilities
- **100% local voice transcription** via faster-whisper
- **Single-user security** with path traversal protection

## Documentation Index

| Document | Description |
|----------|-------------|
| [Setup Guide](setup.md) | Installation, configuration, and pre-flight checks |
| [Usage Guide](usage.md) | Bot commands, message types, and interaction patterns |
| [Agents & Skills](agents.md) | Complete reference for all agents, plugins, and skills |
| [Security](security.md) | Security model, access control, and data protection |
| [Architecture](architecture.md) | System architecture and component breakdown |

## Quick Start

```bash
# 1. Clone and setup
git clone <repo-url> opencode-personal-agent
cd opencode-personal-agent

# 2. Configure environment
cp .env.example .env
# Edit .env with your Telegram bot token and chat ID

# 3. Install dependencies
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt

# 4. Run setup and checks
python -m src.cli setup
python -m src.cli check

# 5. Start the bot
python -m src.cli start
```

## Available Agents

The bot uses OpenCode's multi-agent system with 8 specialized agents:

| Agent | Model | Purpose |
|-------|-------|---------|
| `build` | deepseek-v4-flash | Build new features and code (default) |
| `plan` | glm-5.1 | Architecture and implementation planning |
| `explore` | deepseek-v4-flash | Explore and understand codebases |
| `debug` | glm-5.1 | Systematic debugging and root cause analysis |
| `review` | glm-5.1 | Code review and security analysis |
| `docs` | deepseek-v4-flash | Generate documentation |
| `file-parser` | kimi-k2.6 | Analyze images, documents, video |
| `general` | deepseek-v4-flash | General-purpose research and multi-step tasks |

## Plugins

Two OpenCode plugins extend the bot's capabilities:

| Plugin | Description |
|--------|-------------|
| `superpowers` | Enhanced AI capabilities and advanced tools |
| `@asidorenko/openslimedit` | Efficient file editing operations |

## Skills

Over 20 skills provide domain-specific guidance:

| Skill | Domain |
|-------|--------|
| `python` | Python best practices |
| `react-next` | React and Next.js development |
| `flutter` | Flutter/Dart with Riverpod |
| `go` | Go best practices |
| `rust` | Rust best practices |
| `dotnet` | .NET Clean Architecture |
| `java-spring` | Java Spring Boot |
| `node-express` | Node.js and Express |
| `ruby-rails` | Ruby on Rails |
| `typescript` | TypeScript strict mode |
| `sql-migrations` | SQL migration best practices |
| `ux-responsive` | Responsive UX design |
| `career-content` | Resume, LinkedIn, cover letters |
| `blogger` | Content creation |
| `brutal-critic` | Content review |
| `legal-advisor` | Legal research |
| `docs-validation` | Documentation quality |
| `agent-diagnostics` | Agent setup validation |
| `project-bootstrap` | Project scaffolding |

## Use Case Examples

### Code Development

```
Send to bot: "Build a Python function to parse JSON config files with validation"
Agent: build (with python skill)
```

### Architecture Planning

```
Send to bot: "Plan the architecture for a microservice that processes invoices"
Agent: plan or planner
```

### Code Review

```
Send to bot: "Review this code for security vulnerabilities and suggest improvements"
Agent: review
```

### Debugging

```
Send to bot: "Investigate why the API endpoint returns 500 errors"
Agent: debug
```

### Documentation

```
Send to bot: "Generate API documentation for the OpenCode client module"
Agent: docs
```

### File Analysis

```
Send to bot: [attach image] "Analyze this screenshot and extract the text"
Agent: file-parser
```

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with command list |
| `/help` | Detailed help with all available commands |
| `/new` | Clear current session and start fresh |
| `/status` | Show server health and uptime |
| `/restart` | Restart the OpenCode server process |

## Message Types

| Type | Handling |
|------|----------|
| **Text** | Forwarded directly to OpenCode agent |
| **Photo** | Downloaded to temp storage, path sent for analysis |
| **Document** | Downloaded to temp storage, path sent for processing |
| **Voice** | Transcribed locally with faster-whisper, text forwarded |

## Security

- **Single-user access** via `ALLOWED_CHAT_ID`
- **Path traversal protection** on all file operations
- **Sensitive file blocklist** prevents credential exposure
- **Local voice transcription** — no audio sent to cloud APIs
- **Auto-cleanup** of temporary files older than 1 hour

See [Security Documentation](security.md) for details.

## Testing

```bash
# Run full test suite with coverage
pytest tests/ --cov=src -v

# Test a single file
python -m pytest tests/test_bot.py -v
```

## Project Structure

```
opencode-personal-agent/
├── src/
│   ├── main.py              # Entry point
│   ├── cli.py               # CLI commands
│   ├── config.py            # Config validation
│   ├── bootstrap.py         # Pre-flight checks
│   ├── security.py          # Path traversal + sensitive file guard
│   ├── bot/                 # Telegram bot logic
│   ├── opencode/            # OpenCode HTTP client
│   ├── process/             # Process manager
│   └── voice/               # Voice transcriber
├── storage/
│   ├── logs/
│   ├── models/              # HF cache for faster-whisper
│   ├── temp/                # Staging downloads (auto-cleaned)
│   └── uploads/             # User uploaded files (auto-cleaned)
├── tests/
├── docs/
│   ├── en/                  # English documentation
│   └── it/                  # Italian documentation
├── .opencode/               # OpenCode agent configuration
└── run.ps1 / run.sh         # Launchers
```

## Requirements

- Python 3.12+ (3.13+ recommended)
- OpenCode CLI installed and configured
- Telegram Bot Token (from @BotFather)
- Allowed Chat ID for security

## License

MIT License — see [LICENSE](../LICENSE) for details.
