# Setup

## Requirements

- Python 3.12+ (3.13+ recommended)
- OpenCode CLI installed and configured
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

## Installation

### 1. Clone the repository

```bash
git clone <repo-url> opencode-personal-agent
cd opencode-personal-agent
```

### 2. Create virtual environment

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

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | From @BotFather (`digits:alphanumerics`) |
| `ALLOWED_CHAT_ID` | ✅ | Restrict bot to one chat ID for security |
| `OPENCODE_PROJECT_DIR` | ✅ | Path to your OpenCode project |
| `OPENCODE_SERVER_URL` | ✅ | e.g. `http://127.0.0.1:4096` |
| `OPENCODE_SERVER_USERNAME` | no | Default: `opencode` |
| `OPENCODE_SERVER_PASSWORD` | no | Required if server has auth |
| `WHISPER_LANGUAGE` | no | Voice transcription language (`auto`, `it`, `en`, etc.) |

### 4. Run setup

```bash
python -m src.cli setup
```

Creates `.env` from example (if missing) and ensures `storage/` directories exist.

### 5. Verify

```bash
python -m src.cli check
```

All checks must pass before starting the bot.

### 6. Start

```bash
python -m src.cli start
```

Or use the launcher:

**Windows:**
```powershell
.\run.ps1
```

**Linux/macOS:**
```bash
chmod +x run.sh
./run.sh
```
