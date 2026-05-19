# OpenClaw — Personal AI Assistant

Testing OpenClaw on Windows with DeepSeek + Gemini Vision.
If successful, migrate to Linux mini PC for permanent setup.

## Setup

```powershell
# 1. Install OpenClaw
npm install -g openclaw@latest

# 2. Create .env from template
copy .env.example .env

# 3. Edit .env with your keys:
#    DEEPSEEK_API_KEY (from https://platform.deepseek.com/api_keys)
#    GEMINI_API_KEY  (from https://aistudio.google.com/apikey)
#    TELEGRAM_BOT_TOKEN (from @BotFather)
#    TELEGRAM_OWNER_ID (your Telegram user ID)

# 4. Start the gateway
.\start-openclaw.ps1

# Gateway listens on http://localhost:18789
```

## Structure

```
openclaw.json          # Model, channel, owner config (committed to git)
.env                   # API keys, secrets (gitignored)
start-openclaw.ps1     # Launcher script
```

## Estimated costs

| Provider | Model | Cost |
|----------|-------|------|
| DeepSeek API | deepseek-v4-flash | $0.14/1M input |
| Gemini API | gemini-3-flash-preview | ~$0.15/1M input |
| **Total** (500 msgs + 50 photos/month) | | **~$0.12/month** |
