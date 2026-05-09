# Security

## Overview

The bot is designed as a **mobile interface** for OpenCode, not as a general-purpose AI service. Security measures focus on:

1. **Access control** — only authorized Telegram users
2. **Path traversal prevention** — safe file handling
3. **Sensitive file blocking** — prevent credential exposure
4. **Auto-cleanup** — prevent temp file accumulation

## Access Control

The bot uses `ALLOWED_CHAT_ID` to restrict access to a single Telegram chat:

```python
if chat.id != allowed_chat_id:
    await update.effective_message.reply_text("Access denied.")
```

**Recommendation:** Always set `ALLOWED_CHAT_ID`. You can get your chat ID by messaging [@userinfobot](https://t.me/userinfobot) on Telegram.

## Path Traversal Protection

The `safe_path()` function prevents directory traversal attacks:

```python
safe_path("photo.jpg", Path("storage/temp"))     # ✅ OK
safe_path("../../etc/passwd", Path("storage/temp"))  # ❌ Blocked
```

It resolves the requested path against a base directory and ensures the result stays within it.

## Sensitive File Blocklist

The following file patterns are blocked from download:

- `.env`, `.env.local`, `.env.*`
- `.ssh/`, `id_rsa`, `id_ed25519`, `authorized_keys`
- `.pem`, `.key`, `.p12`, `.pfx`
- `credentials`, `secrets`, `secret`, `token`
- `.aws/`, `.docker/`, `.netrc`, `.htpasswd`

## Voice Privacy

Voice transcription is **100% local**. No audio data is sent to cloud APIs:
- Uses `faster-whisper` with model "small" on CPU (int8 quantization)
- Model files cached in `storage/models/`
- Audio files staged in `storage/temp/` and auto-cleaned

## Temp File Cleanup

At every startup, files in `storage/temp/` older than 1 hour are deleted:

```python
def _clean_temp():
    cutoff = time.time() - 3600
    for entry in temp_dir.iterdir():
        if entry.is_file() and entry.stat().st_mtime < cutoff:
            entry.unlink()
```

## `.opencode/` Isolation

The bot **never writes** to `.opencode/`. This directory is reserved for local OpenCode configuration.

## Environment Variables

The `.env` file is never read by the bot after startup. All values are loaded into an immutable `Config` dataclass.

## Session Handling

Sessions are stored **in memory only** (`dict[int, str]`). No session data persists beyond bot restart.
