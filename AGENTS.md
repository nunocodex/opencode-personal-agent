# OpenCode Agents Project

### 2026-05-10 06:00 - Scheduled Events System (Scheduler)
**Agent:** orchestrator / codebase / planner / general
**Summary:** Added autonomous scheduled events system. Bot can now execute reminders and recurring messages without user commands.
- **Testing:** 199 tests across 21 test files. Scheduler 98.21% stmts, 98.98% lines coverage.
- **Scheduler engine:** 1-second tick loop, atomic JSON persistence, exponential backoff retry, graceful shutdown with tick drain.
- **Event types:** One-shot reminders (e.g., "tra 5 minuti") and recurring schedules (cron, daily, weekly, interval).
- **OpenCode integration:** Scheduling driven by `[SCHEDULE]` blocks in OpenCode responses — no Telegram commands needed.
- **Safety:** Missed events skipped on restart (not executed catch-up). Unauthorized events deleted. `allowedChatId` enforced.
- **Git:** Commit `228ad2d` on `main`. 25 files changed, 951 insertions.

### 2026-05-09 22:00 - Merge Complete Verification & Voice into main
**Agent:** orchestrator / codebase / planner / general
**Summary:** Merged `feat/complete-verification` into `main`. Project now has 158 tests, 91%+ coverage, full voice support, and multilingual transcription.
- **Testing:** 158 tests across 15 test files. ProcessManager 100%, CommandHandler 100%, VoiceHandler 96%, spawnAsync 100%, transcribe 100% statements.
- **Voice workflow:** Async `spawnAsync` wrapper (timeout + cancellation), ffmpeg OGG→WAV conversion, whisper.cpp local transcription with auto-detect or configurable language (`WHISPER_LANGUAGE`), `VoiceHandler` integrated into TelegramBot lifecycle.
- **Docs:** Created `docs/ProcessStateStore.md` to complete API reference suite.
- **Config:** Added `WHISPER_BINARY_PATH`, `WHISPER_MODEL_PATH`, `WHISPER_LANGUAGE` env vars to `bot.config.ts`.
- **Git:** Merged `feat/complete-verification` → `main` with merge commit `02ed5eb`. Branch renamed `master` → `main`.

### 2026-05-08 12:00 - Stage 1 Process State Management Module
**Agent:** codebase
**Summary:** Implemented centralized process lifecycle management for `opencode serve` child process.
- Created `src/process/ProcessManager.ts` with idempotent `start()`, graceful `stop()` (SIGTERM → SIGKILL, Windows `taskkill` fallback), `restart()`, health checks with Basic Auth, state tracking, and callback subscriptions.
- Created `src/process/ProcessStateStore.ts` mirroring `SessionStore.ts` pattern with atomic writes to `./data/process-state.json`.
- Refactored `src/opencode/Server.ts` to strip all process management, keeping only `getAttachUrl()` and URL constants.
- Updated `src/bot/TelegramBot.ts` to instantiate `ProcessManager` from config, call `start()`/`stop()` on lifecycle events, and export the instance for graceful shutdown.
- Updated `src/index.ts` with `try/catch/finally` wrapper ensuring `processManager.stop()` is called on fatal errors.
- Added `/status` and `/restart` commands to `src/bot/handlers/CommandHandler.ts` with human-readable output.
- Build passes (`npm run build`) with zero TypeScript errors in strict mode.

Project-scoped OpenCode installation wrapping the `agents-opencode` plugin. All agent configs, commands, and skills live under `.opencode/`.

## Project Stack

- TypeScript 5.7+ strict, ESM (`"type": "module"`)
- Node 22+, `Node16` module resolution
- Build target: `dist/` from `src/`
- No test runner, linter, or formatter configured

## Daily Commands

| Command | What it does |
|---------|--------------|
| `npm run build` | `tsc` — compiles `src/` to `dist/` |
| `npm run dev` | `tsc --watch` |
| `npm start` | `node dist/index.js` |

Run `build` before `start`; there is no pre-build hook.

## OpenCode Config

`opencode.json` loads `agents-opencode` and sets restrictive permissions:

- `external_directory: deny` — agents cannot write outside the workspace
- `doom_loop: deny` — iterative loops are blocked by default

## Agent Inventory

| Agent | Purpose |
|-------|---------|
| `@orchestrator` | Multi-phase coordination, execution loops |
| `@planner` | Read-only architecture and refactoring plans |
| `@codebase` | Feature implementation, test generation |
| `@review` | Security, performance, code quality |
| `@docs` | README, API docs, ADRs |
| `@em-advisor` | Leadership / 1-on-1 guidance |
| `@blogger` | Tech content drafting |
| `@brutal-critic` | Harsh content quality gate |
| `@legal-advisor` | License, IP, privacy audits |

## Custom Commands

Slash commands are defined as `.md` files in `.opencode/commands/`. Run with `/command-name` in the TUI.

High-value ones:
- `/plan-project [goal]` — orchestrator phase planning
- `/execution-loop [task]` — bounded verify-and-continue loop
- `/code-review [scope]` — review current changes or a file
- `/generate-tests [file]` — generate unit tests
- `/refactor-plan [scope]` — planner-driven refactoring
- `/security-audit [scope]` — security review
- `/legal-review [scope]` — compliance audit
- `/blog-post [topic]` — draft content
- `/content-review [text]` — brutal-critic review

Add a new command:
1. Create `.opencode/commands/<name>.md`
2. Frontmatter:
   ```yaml
   ---
   description: What this does
   agent: recommended-agent
   subtask: true
   ---
   ```
3. Write the prompt template in the body

## Skills

Load on-demand with the `skill` tool. Available:
`typescript`, `node-express`, `react-next`, `python`, `go`, `rust`, `java-spring`, `dotnet`, `ruby-rails`, `flutter`, `sql-migrations`, `ux-responsive`, `blogger`, `brutal-critic`, `docs-validation`, `agent-diagnostics`, `project-bootstrap`.

Add a new skill by creating a directory under `.opencode/skills/<name>/` with a `SKILL.md` entry point.

## Entry Point

`src/index.ts` is the compiled CLI entry point (`#!/usr/bin/env node`). Currently minimal; extend here for custom runtime logic.

## Notes

- `.opencode/` is managed by the OpenCode CLI; do not edit agent `.md` configs unless you intend to change agent behavior globally for this project.
- `package-lock.json` in `.opencode/` pins the plugin version.
- No CI, pre-commit, or automated checks are set up.
