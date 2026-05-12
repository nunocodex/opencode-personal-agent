# Setup

Complete setup instructions for the OpenCode Personal Agent Telegram bot.

## Requirements

- **Python 3.12+** (3.13+ recommended)
- **OpenCode CLI** installed and configured
- **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)
- **Telegram Chat ID** for security (your personal chat ID)

## Installation

### 1. Clone the Repository

```bash
git clone <repo-url> opencode-personal-agent
cd opencode-personal-agent
```

### 2. Create Virtual Environment

**Windows (PowerShell):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Linux/macOS:**

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather (format: `digits:alphanumerics`) |
| `ALLOWED_CHAT_ID` | Yes | Your Telegram chat ID for security |
| `OPENCODE_PROJECT_DIR` | Yes | Path to your OpenCode project directory |
| `OPENCODE_SERVER_URL` | Yes | OpenCode server URL (e.g., `http://127.0.0.1:4096`) |
| `OPENCODE_SERVER_USERNAME` | No | Server username (default: `opencode`) |
| `OPENCODE_SERVER_PASSWORD` | No | Server password (required if auth enabled) |
| `WHISPER_LANGUAGE` | No | Voice transcription language (`auto`, `it`, `en`, etc.) |
| `max_file_size` | No | Maximum file size in bytes (default: 52428800 = 50MB) |
| `rate_limit_seconds` | No | Rate limit between messages (default: 2.0) |

#### Getting Your Chat ID

To get your Telegram chat ID:

1. Start a chat with [@userinfobot](https://t.me/userinfobot)
2. It will reply with your chat ID (a number like `123456789`)
3. Use this value for `ALLOWED_CHAT_ID`

### 4. OpenCode Configuration

The bot uses OpenCode configuration from `.opencode/opencode.json`. This file defines:

- **Default agent:** `build`
- **Available agents:** 8 specialized agents (build, plan, review, docs, etc.)
- **Plugins:** superpowers, openslimedit
- **Skills:** Auto-allowed skills for domain-specific guidance
- **Models:** Model assignments per agent

No changes are needed for basic usage. Advanced users can modify agent configurations in `.opencode/`.

#### Plugin Configuration

Two plugins are configured:

| Plugin | Purpose |
|--------|---------|
| `superpowers` | Enhanced AI capabilities and tools |
| `@asidorenko/openslimedit` | Efficient file editing operations |

Plugins are automatically loaded by OpenCode. No additional setup required.

#### Skill Configuration

Skills are auto-allowed in the permission configuration:

```json
"permission": {
  "skill": {
    "*": "allow"
  }
}
```

All available skills can be used by any agent. Skills provide domain-specific guidance for:

- Programming languages (Python, React, Flutter, Go, Rust, etc.)
- Content creation (blogger, brutal-critic)
- Professional services (legal-advisor, career-content)
- Development tools (docs-validation, agent-diagnostics)

See [Agents & Skills](agents.md) for the complete skill list.

### 5. Run Setup

```bash
python -m src.cli setup
```

This command:
- Creates `.env` from example (if missing)
- Ensures `storage/` directories exist (`logs/`, `models/`, `temp/`, `uploads/`)

### 6. Verify Configuration

```bash
python -m src.cli check
```

Pre-flight checks include:
- Python version validation (3.12+)
- `.env` file existence
- Configuration loading and validation
- `opencode` command in PATH
- Storage directory creation
- Temp file cleanup (files >1h old)

All checks must pass before starting the bot.

### 7. Start the Bot

```bash
python -m src.cli start
```

Or use the launcher scripts:

**Windows:**

```powershell
.\run.ps1
```

**Linux/macOS:**

```bash
chmod +x run.sh
./run.sh
```

The bot will:
1. Run pre-flight checks
2. Start the OpenCode server (`opencode serve`)
3. Wait 5 seconds and verify health
4. Launch the Telegram listener

## Storage Directories

The setup creates these directories under `storage/`:

| Directory | Purpose |
|-----------|---------|
| `logs/` | Bot and server logs |
| `models/` | Whisper model cache (HF_HOME) |
| `temp/` | Temporary file staging (auto-cleaned) |
| `uploads/` | User uploaded files |

All directories are gitignored except for `.gitkeep` placeholder files.

## Troubleshooting

### Python Version Error

```
Error: Python 3.12+ required
```

**Solution:** Install Python 3.12 or later from [python.org](https://www.python.org/).

### OpenCode Not Found

```
Error: opencode command not found in PATH
```

**Solution:** Install OpenCode CLI and ensure it's in your PATH.

### Invalid Bot Token

```
ValueError: Invalid TELEGRAM_BOT_TOKEN format
```

**Solution:** Verify your token from @BotFather matches the format `digits:alphanumerics`.

### Chat ID Mismatch

If you receive "Access denied" messages:

**Solution:** Verify `ALLOWED_CHAT_ID` matches your actual Telegram chat ID.

### Port Already in Use

```
Error: Port 4096 is already in use
```

**Solution:** Stop any existing OpenCode server or change `OPENCODE_SERVER_URL` to a different port.

## Next Steps

After successful setup:

1. Read the [Usage Guide](usage.md) for bot commands and features
2. Review [Agents & Skills](agents.md) to understand available agents
3. Check [Security](security.md) for security model details
4. Explore [Architecture](architecture.md) for system internals
