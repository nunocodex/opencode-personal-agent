---
name: security-threat-model
description: Security checklist for this project. Load when auditing or modifying bot handlers, auth, file I/O, subprocess management, or input handling.
---

# Threat model

Single-user app. The only trusted user is the allowed chat id.

## Checks
1. **Path traversal** — every user-derived path goes through shared validation. Flag direct `Path(arg)`, `open(arg)`, `os.path.join(base, arg)`.
2. **Sensitive file blocklist** — `.env`, `*.key`, `*.pem`, secret configs must be denied in ALL download paths.
3. **Auth** — every bot handler verifies allowed chat id. Missing check = critical.
4. **Temp file lifecycle** — audio temp files deleted on exception path too (try/finally or context manager).
5. **Subprocess env hygiene** — `opencode serve` env built from explicit whitelist, not inherited whole.
6. **Logging** — no tokens, chat ids, or user paths at INFO/DEBUG.
7. **Voice locality** — no `openai`, `anthropic`, `google`, `azure` imports in `src/voice/`.

## Output (Italian)
For each finding:
- Severity (critical/high/medium/low)
- File:line
- Category number
- Problem (concrete)
- Proposed fix (specific)

No findings → say so. Do not invent.