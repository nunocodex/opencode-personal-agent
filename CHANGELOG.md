# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Migrated agent definitions from inline JSON in `.opencode/opencode.json` to standalone `.md` files in `.agents/agents/` (cross-tool compatible format)
- Replaced `plan-opus` and `plan-haiku` with `ultraplan` agent (uses ultraplan skill, 6-phase pipeline)
- Added `scout` subagent (built-in OpenCode, now mapped)
- `file-parser` model: kimi-k2.6 → qwen3.6-plus (multimodal)
- `debug`, `review`, `docs` model: glm-5.1 → deepseek-v4-pro (power text-only)
- `plan` model: glm-5.1 → deepseek-v4-flash (flash tier)
- Slimmed `opencode.json` to model/default_agent/plugin/skill permissions only
- Created junction `.opencode/agents/` → `.agents/agents/` for OpenCode discovery

## [0.2.0] - 2025-04-02

### Added

- New tiered agent configuration (light/medium/heavy/auditor)
- File-parser agent with vision support via Kimi K2.6
- Base64 image embedding in API payload for vision-capable models
- Scheduled events system (scheduler)
- Voice message transcription with faster-whisper
- Configurable transcription language via `WHISPER_LANGUAGE`

### Changed

- Migrated agent config to `.opencode/` directory
- Reworked agent config with new tiered structure
- File-parser agent description made generic (not Telegram-specific)

### Fixed

- Security: PII removed from logs, sensitive env vars stripped from subprocess
- Security: path traversal protection hardened, sensitive file blocklist
- Windows: port cleanup via netstat + taskkill
- Windows: use process.terminate() instead of CTRL_BREAK_EVENT
- Transport warnings: close subprocess pipe transports on shutdown
- Markdown parse errors for JSON tool-use responses
- ProcessManager cleanup on startup failure
- Telegram files saved in `storage/uploads/` for OpenCode access

## [0.1.0] - 2025-03-22

### Added

- Initial Telegram bot integration with OpenCode serve
- 5 bot commands: `/start`, `/help`, `/new`, `/status`, `/restart`
- 4 message types: text, photo, document, voice
- Async process lifecycle management (start/stop/restart)
- In-memory session store (`dict[int, str]`)
- Safe path handling with traversal prevention
- Documentation in English and Italian
- Launcher scripts: `run.ps1` (Windows) and `run.sh` (Unix)
- 68 tests with 84% coverage
