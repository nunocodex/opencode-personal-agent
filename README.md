# OpenCode Agents Bot

A Telegram bot wrapper around the [OpenCode](https://opencode.ai) CLI server. The bot spawns `opencode serve` as a managed child process and communicates with it via HTTP, giving you remote control and monitoring of your AI agent workspace from Telegram.

## Architecture

```
User (Telegram)
       |
       v
Telegram Bot  ------>  ProcessManager  ------>  opencode serve CLI
   (telegraf)            (lifecycle)            (child process)
      |                         |                        |
      |                         v                        v
      |                   ProcessStateStore          HTTP API
      |                   (data/process-state.json)   (/global/health)
      |
      v
EventScheduler  <----->  EventStore
(1s tick loop)          (data/events.json)
```

**Data flow:**
1. User sends a message or command via Telegram
2. `TelegramBot` routes commands to `CommandHandler` and chat messages to the OpenCode HTTP API
3. OpenCode can generate `[SCHEDULE]` blocks in responses → `EventScheduler` creates reminders
4. `ProcessManager` starts, stops, monitors, and restarts the `opencode serve` child process
5. `ProcessStateStore` persists process status to `./data/process-state.json` for observability and crash recovery
6. `EventStore` persists scheduled events to `./data/events.json` for crash recovery

## Features

- **Remote process control** — start, stop, and restart `opencode serve` from Telegram
- **Health monitoring** — periodic HTTP health checks with configurable Basic Auth
- **Circuit breaker** — blocks restart loops after 3 attempts per minute
- **Port conflict detection** — automatically kills stray processes occupying the server port
- **Graceful shutdown** — SIGTERM → SIGKILL escalation with Windows `taskkill` fallback
- **State persistence** — process status, PID, uptime, and failure counts saved to disk
- **Session management** — per-chat sessions with `/new` to reset conversations
- **Voice messages** — local transcription via whisper.cpp + ffmpeg (Italian/multilingual)
- **Scheduled events** — reminders and recurring messages via natural language (`ricordami tra 5 minuti`)
- **Event persistence** — scheduled events survive crashes and resume on restart

## Environment Variables

Create a `.env` file in the project root. All variables are read at startup via `dotenv`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | **Yes** | — | Bot token from [@BotFather](https://t.me/BotFather). Format: `123456789:ABCdef...` |
| `ALLOWED_CHAT_ID` | No | — | If set, only this chat ID can interact with the bot (comma-separated list supported) |
| `OPENCODE_PROJECT_DIR` | No | `process.cwd()` | Working directory where `opencode serve` runs |
| `OPENCODE_SERVER_URL` | No | `http://127.0.0.1:4096` | URL of the OpenCode HTTP server |
| `OPENCODE_SERVER_USERNAME` | No | `opencode` | Basic Auth username for health checks |
| `OPENCODE_SERVER_PASSWORD` | No | — | Basic Auth password for health checks. **Required** if the server has auth enabled |

### Example `.env`

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz
ALLOWED_CHAT_ID=12345678
OPENCODE_SERVER_PASSWORD=your-secure-password
```

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with command list |
| `/help` | Show available commands |
| `/new` | Clear the current session and start a fresh conversation |
| `/status` | Show `opencode serve` status: state, PID, uptime, last health check, start count |
| `/restart` | Gracefully restart the OpenCode server (circuit breaker enforced) |

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [OpenCode CLI](https://opencode.ai) installed globally (`npm install -g opencode`)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Installation

```bash
# Clone or navigate to the project
cd opencode-agents

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Configuration

1. Copy the example above into `.env` in the project root.
2. Set `TELEGRAM_BOT_TOKEN` to your token from BotFather.
3. Optionally set `OPENCODE_SERVER_PASSWORD` if your `opencode serve` instance requires authentication.

### Run

```bash
# Production start
npm start

# Development (watch mode)
npm run dev
```

> **Note:** Run `npm run build` before `npm start`; there is no pre-build hook.

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript (`src/` → `dist/`) |
| `npm run dev` | Watch mode (`tsc --watch`) |
| `npm start` | Run compiled CLI entry point |
| `npm test` | Run the Vitest test suite (199 tests across 21 files, 88%+ coverage) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Process State File

Process status is persisted atomically to:

```
./data/process-state.json
```

This file tracks:
- `status` — current lifecycle state (`stopped`, `starting`, `running`, `unhealthy`, `restarting`, `failed`)
- `pid` — OS process ID (when running)
- `uptimeMs` — milliseconds since last start
- `lastHealthCheck` — timestamp of the last successful/failed health check
- `consecutiveFailures` — count of failed health checks since last success
- `startCount` — total number of starts in the current process lifetime
- `lastExitCode` — exit code from the last process termination

The file is written atomically (temp + rename) and survives process crashes.

## Windows-Specific Notes

On Windows, `ProcessManager` handles platform differences automatically:

- **`.cmd` spawn** — `opencode.cmd serve` is used instead of `opencode`
- **`shell: true`** — required for `.cmd` execution on Windows
- **Port conflict detection** — `netstat -ano | findstr :<port>` is used to detect occupied ports, followed by `taskkill /PID <pid> /F`
- **Graceful shutdown** — falls back from `SIGTERM` to `taskkill /F` if the process does not exit within the configured timeout

No manual intervention is required, but if you need to clean up a stuck process manually:

```cmd
netstat -ano | findstr :4096
taskkill /PID <PID> /F
```

## Project Structure

```
.
├── src/
│   ├── bot/
│   │   ├── TelegramBot.ts          # Bot initialization and lifecycle
│   │   ├── SessionStore.ts         # Per-chat session persistence
│   │   ├── handlers/
│   │   │   ├── CommandHandler.ts   # /start, /status, /restart, etc.
│   │   │   ├── TextHandler.ts      # Text messages → OpenCode API
│   │   │   ├── DocumentHandler.ts  # Documents → OpenCode API
│   │   │   ├── PhotoHandler.ts     # Photos → OpenCode API
│   │   │   └── VoiceHandler.ts     # Voice messages → transcription → OpenCode
│   │   └── utils/
│   │       ├── sendReply.ts        # Reply chunking, file attachments
│   │       ├── parseScheduleBlocks.ts
│   │       └── processScheduleBlocks.ts
│   ├── config/
│   │   └── bot.config.ts           # Environment variable parsing
│   ├── opencode/
│   │   ├── Client.ts               # HTTP client for OpenCode API
│   │   └── Server.ts               # URL helpers and constants
│   ├── process/
│   │   ├── ProcessManager.ts       # Child process lifecycle manager
│   │   └── ProcessStateStore.ts    # JSON-backed state persistence
│   ├── scheduler/
│   │   ├── EventScheduler.ts       # 1s tick loop, retry, graceful shutdown
│   │   ├── EventStore.ts           # Atomic JSON persistence for events
│   │   ├── scheduleParser.ts       # Cron/daily/weekly/interval parser
│   │   ├── timeParser.ts           # Relative/absolute time parser
│   │   └── executeEvent.ts         # Telegram message delivery
│   ├── voice/
│   │   ├── spawnAsync.ts           # Async spawn with timeout/cancellation
│   │   ├── assets.ts               # Whisper binary/model download
│   │   └── transcribe.ts           # ffmpeg OGG→WAV → whisper transcription
│   └── index.ts                    # CLI entry point
├── dist/                           # Compiled output
├── docs/                           # Documentation
├── data/                           # Runtime data (process-state.json, events.json)
├── .opencode/                      # Agent configs, commands, skills
├── .env                            # Environment variables (not in git)
├── opencode.json                   # OpenCode CLI configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json
```

## Tech Stack

- TypeScript 5.7+ (strict, ESM, Node16 module resolution)
- Node.js 22+
- [Telegraf](https://telegraf.js.org/) for Telegram Bot API
- [Vitest](https://vitest.dev/) for testing
- OpenCode CLI + `agents-opencode` plugin

## License

MIT
