# Telegram AI Assistant

TypeScript ESM project. grammY bot + Vue 3 Vite dashboard.

## Commands

```
npm run dev        # Start bot in dev mode
npm run build      # Compile TypeScript
npm run typecheck  # Type check
npm test           # Run tests (vitest)
```

## Stack

- **Runtime:** Node 22+, TypeScript 5 (ESM)
- **Bot framework:** grammY
- **SDK:** @opencode-ai/sdk/v2
- **Voice:** @xenova/transformers (ONNX Whisper small)
- **Dashboard:** Vue 3 + Vite + Express
- **Config:** zod validation
- **Memory:** opencode-working-memory plugin

## Architecture

```
src/
├── config.ts             # Zod env validation
├── main.ts               # Entry point
├── bot/
│   ├── app.ts            # grammY Bot setup
│   ├── handlers.ts       # /start, /help, /new, /status, text
│   ├── media.ts           # Photo, document, voice handlers
│   └── utils.ts           # send_reply, auth, typing
├── opencode/
│   └── client.ts          # SDK v2 wrapper
├── voice/
│   └── transcriber.ts     # @xenova/transformers Whisper
├── dashboard/
│   ├── server.ts          # Express server
│   └── client/            # Vue 3 + Vite SPA
└── memory/
    └── session.ts         # In-memory Map<userId, sessionId>
```

## Key conventions

- Telegram bot is read-only — no codebase access from mobile
- opencode serve runs separately (not managed by code)
- Use data URI for media (no disk writes)
- Media analysis uses disposable sessions with vision model (qwen3.5-plus)
- Sessions are in-memory (no persistence)
- Auth: single user via TELEGRAM_ALLOWED_USER_ID
