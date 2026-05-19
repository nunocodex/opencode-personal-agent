# OpenClaw Setup Guide

## Prerequisites
- Ubuntu 22.04+ (or any Debian-based Linux)
- Internet connection

## 1. Install Node.js 24

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git
node --version  # Should be 24.x
```

## 2. Install OpenClaw

```bash
npm install -g openclaw@latest
openclaw --version
```

## 3. Clone the project (config + templates)

```bash
git clone https://github.com/nunocodex/opencode-personal-agent.git
cd opencode-personal-agent
git checkout feat/openclaw
```

## 4. Create `.env` with your keys

```bash
cp .env.example .env
nano .env
```

Fill in:
- `DEEPSEEK_API_KEY` — from https://platform.deepseek.com/api_keys
- `GEMINI_API_KEY` — from https://aistudio.google.com/apikey
- `TELEGRAM_BOT_TOKEN` — from @BotFather on Telegram
- `TELEGRAM_OWNER_ID` — your Telegram user ID (get from @userinfobot)
- `OPENCLAW_GATEWAY_TOKEN` — generate with: `uuidgen` or any random string

## 5. Copy config to OpenClaw home

```bash
mkdir -p ~/.openclaw
cp openclaw.json ~/.openclaw/
cp .env ~/.openclaw/.env
```

## 6. Start the gateway

```bash
openclaw gateway
```

You should see:
```
- Telegram configured, enabled automatically.
- deepseek/deepseek-v4-flash model configured, enabled automatically.
- google/gemini-3-flash-preview model configured, enabled automatically.
```

## 7. Pair Telegram

- Send a message to your bot on Telegram
- You'll receive a pairing code
- Approve it:

```bash
openclaw pairing approve telegram <CODE>
```

## 8. Test

- Send "ciao" to the bot — should reply
- Send a photo — Gemini analyzes it
- Open dashboard: http://localhost:18789
  - Token: the `OPENCLAW_GATEWAY_TOKEN` you set in `.env`

## 9. Auto-start on boot (optional)

```bash
openclaw gateway install
```

This installs a systemd service. The gateway starts automatically when the machine boots.

## 10. Update from GitHub

```bash
cd ~/opencode-personal-agent
git pull origin feat/openclaw
cp openclaw.json ~/.openclaw/
openclaw gateway stop
openclaw gateway
```

## Architecture

```
User -> Telegram -> OpenClaw Gateway -> DeepSeek (text)
                                   \-> Gemini Flash (images)

Config: ~/.openclaw/openclaw.json  (from project git repo)
Secrets: ~/.openclaw/.env          (never committed)
```

## Estimated costs

| Model | Use case | Cost |
|-------|----------|------|
| DeepSeek V4 Flash | Text messages | $0.14/1M input tokens |
| Gemini Flash | Image analysis | ~$0.15/1M input tokens |
| **Monthly total** (personal use) | | **~$0.27/month** |
