# Security

Security documentation for the OpenCode Personal Agent Telegram bot.

## Overview

The bot is designed as a **mobile interface** for OpenCode, not as a general-purpose AI service. Security measures focus on:

1. **Access control** — Only authorized Telegram users
2. **Path traversal prevention** — Safe file handling
3. **Sensitive file blocking** — Prevent credential exposure
4. **Auto-cleanup** — Prevent temp file accumulation
5. **Skill permissions** — Controlled skill access

## Access Control

The bot uses `ALLOWED_CHAT_ID` to restrict access to a single Telegram chat:

```python
if chat.id != allowed_chat_id:
    await update.effective_message.reply_text("Access denied.")
```

**Recommendation:** Always set `ALLOWED_CHAT_ID`. You can get your chat ID by messaging [@userinfobot](https://t.me/userinfobot) on Telegram.

### Single-User Design

The bot is intentionally designed for single-user access:

- **Personal use:** Mobile interface for individual developers
- **Reduced attack surface:** No multi-user complexity
- **Simplified security:** One trusted chat ID

**For multi-user scenarios:** Deploy separate bot instances per user.

## Path Traversal Protection

The `safe_path()` function prevents directory traversal attacks:

```python
safe_path("photo.jpg", Path("storage/temp"))     # OK
safe_path("../../etc/passwd", Path("storage/temp"))  # Blocked
```

**Implementation:**
- Resolves the requested path against a base directory
- Ensures the resolved path stays within the base directory
- Blocks any path that escapes the intended directory

**Applied to:**
- Photo downloads
- Document downloads
- Voice message downloads
- Any file system operation

## Sensitive File Blocklist

The following file patterns are blocked from download:

| Pattern | Reason |
|---------|--------|
| `.env`, `.env.local`, `.env.*` | Environment variables with secrets |
| `.ssh/`, `id_rsa`, `id_ed25519`, `authorized_keys` | SSH credentials |
| `.pem`, `.key`, `.p12`, `.pfx` | SSL/TLS certificates and keys |
| `credentials`, `secrets`, `secret`, `token` | Credential files |
| `.aws/`, `.docker/`, `.netrc`, `.htpasswd` | Service credentials |

**Implementation:** The `is_sensitive()` function checks filenames against this blocklist.

## Voice Privacy

Voice transcription is **100% local**. No audio data is sent to cloud APIs:

- **Model:** `faster-whisper` with model "small"
- **Execution:** CPU only, int8 quantization
- **Storage:** Model files cached in `storage/models/`
- **Audio files:** Staged in `storage/temp/` and auto-cleaned

**Privacy guarantee:** Your voice messages never leave your machine.

## Temp File Cleanup

At every startup, files in `storage/temp/` older than 1 hour are deleted:

```python
def _clean_temp():
    cutoff = time.time() - 3600
    for entry in temp_dir.iterdir():
        if entry.is_file() and entry.stat().st_mtime < cutoff:
            entry.unlink()
```

**Purpose:**
- Prevent disk space exhaustion
- Remove potentially sensitive temporary files
- Maintain clean storage state

## `.opencode/` Isolation

The bot **never writes** to `.opencode/`. This directory is reserved for local OpenCode configuration:

- **Read-only:** Bot reads agent configuration
- **No modifications:** User manages configuration manually
- **Separation of concerns:** Bot runtime vs. AI configuration

## Environment Variables

The `.env` file is never read by the bot after startup:

- **Load once:** All values loaded into immutable `Config` dataclass at startup
- **No runtime changes:** Configuration cannot be modified while running
- **Validation:** Token format and required fields validated at load time

### Secure `.env` Handling

**Best practices:**
- Never commit `.env` to version control
- Use restrictive file permissions (`chmod 600 .env`)
- Rotate bot tokens periodically
- Use strong passwords for OpenCode server auth

## Session Handling

Sessions are stored **in memory only** (`dict[int, str]`):

- **No persistence:** Session data lost on restart
- **No file I/O:** Sessions never written to disk
- **Per-chat isolation:** Each chat has independent session

**Security benefit:** No session data survives bot restart.

## Skill Permissions

Skills are configured in `.opencode/opencode.json`:

```json
"permission": {
  "skill": {
    "*": "allow"
  }
}
```

**Current configuration:** All skills are auto-allowed.

**Skill security considerations:**
- Skills provide guidance only — they don't execute code
- Skills cannot access files directly
- Skills operate within agent permission boundaries
- Agent permissions (read/bash/write) control actual operations

### Agent Permissions

The `file-parser` agent demonstrates restricted permissions:

```markdown
permission:
  edit: deny
  bash: deny
  skill:
    "*": deny
```

**Purpose:** File analysis without modification or execution capabilities.

## Network Security

### OpenCode Server

The bot communicates with OpenCode server via HTTP:

- **Default:** `http://127.0.0.1:4096` (localhost only)
- **Auth:** Basic Auth support (username/password)
- **Recommendation:** Keep server on localhost, use auth in production

### Telegram API

The bot uses Telegram's Bot API:

- **Encrypted:** All Telegram traffic is encrypted
- **Token security:** Bot token must be kept secret
- **Rate limits:** Telegram enforces API rate limits

## Storage Security

### Directory Structure

```
storage/
├── logs/       # Bot and server logs
├── models/     # Whisper model cache
├── temp/       # Temporary files (auto-cleaned)
└── uploads/    # User uploaded files
```

### Security Measures

| Directory | Protection |
|-----------|------------|
| `logs/` | Gitignored, local only |
| `models/` | Read-only model cache |
| `temp/` | Auto-cleaned, restricted access |
| `uploads/` | Sanitized filenames, path protection |

## Threat Model

### Threats Mitigated

| Threat | Mitigation |
|--------|------------|
| Unauthorized access | `ALLOWED_CHAT_ID` restriction |
| Path traversal | `safe_path()` validation |
| Credential exposure | Sensitive file blocklist |
| Disk exhaustion | Temp file auto-cleanup |
| Voice privacy | Local transcription only |
| Session hijacking | In-memory sessions, no persistence |

### Threats Not Mitigated

| Threat | Reason |
|--------|--------|
| Compromised bot token | User responsibility |
| Telegram API compromise | External dependency |
| OpenCode server compromise | External dependency |
| Malicious file uploads | Limited by file type restrictions |

## Security Checklist

Before deploying:

- [ ] Set `ALLOWED_CHAT_ID` to your chat ID
- [ ] Verify bot token is secret and rotated
- [ ] Set OpenCode server auth credentials
- [ ] Ensure `.env` is gitignored
- [ ] Set restrictive permissions on `.env` (`chmod 600`)
- [ ] Verify `opencode` server runs on localhost only
- [ ] Review skill permissions in `.opencode/opencode.json`

## Incident Response

### If Bot Token is Compromised

1. Revoke token via @BotFather
2. Generate new token
3. Update `.env` with new token
4. Restart bot

### If Unauthorized Access Detected

1. Check `ALLOWED_CHAT_ID` configuration
2. Review bot logs for suspicious activity
3. Revoke and regenerate bot token
4. Audit OpenCode server access

## Compliance Notes

### GDPR

- **Data processing:** Voice transcription is local (no data transfer)
- **Data retention:** Temp files auto-deleted after 1 hour
- **Data minimization:** No persistent session storage

### Data Processing

| Data Type | Processing | Storage | Retention |
|-----------|------------|---------|-----------|
| Voice audio | Local transcription | Temp (1h max) | Auto-deleted |
| Photos | Sent to OpenCode | Temp (1h max) | Auto-deleted |
| Documents | Sent to OpenCode | Temp (1h max) | Auto-deleted |
| Text messages | Sent to OpenCode | In-memory | Until restart |
| Session IDs | In-memory tracking | In-memory | Until restart |

## Security Updates

Security patches are released as needed. Monitor the repository for security advisories.

### Reporting Security Issues

**Do not** report security issues via public channels. Contact the maintainer directly.
