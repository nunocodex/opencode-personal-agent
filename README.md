# OpenClaw — Personal AI Assistant

Personal AI assistant using DeepSeek (text) + Gemini Flash (vision) via Telegram.

## Quick start

### Linux (recommended)

See full guide: [`docs/setup-linux.md`](docs/setup-linux.md)

### Windows (WSL2)

See Linux guide above — same commands on WSL2.

### Windows (native)

```powershell
npm install -g openclaw@latest
copy .env.example .env
# edit .env with your keys
.\start-openclaw.ps1
```

## Project structure

```
openclaw.json           # Config: models, channels, owner (committed)
.env                    # API keys, token secrets (gitignored)
.env.example            # Template for .env
docs/setup-linux.md     # Full Linux setup guide
AGENTS.md               # Project rules for OpenCode CLI
```

## Branch reference

| Branch | Content |
|--------|---------|
| `feat/openclaw` | OpenClaw config + setup guides |
| `feat/telegram-bot` | Custom Telegram bot (grammY + Vue) |

## Estimated costs

| Provider | Model | Cost |
|----------|-------|------|
| DeepSeek API | deepseek-v4-flash | $0.14/1M input |
| Gemini API | gemini-3-flash-preview | ~$0.15/1M input |
| **Total** (personal use) | | **~$0.27/month** |
