# Usage

## Starting the Bot

```bash
python -m src.cli start
```

Or via launcher:

**Windows:**
```powershell
.\run.ps1
```

**Linux/macOS:**
```bash
./run.sh
```

The bot will:
1. Run pre-flight checks
2. Start the OpenCode server (`opencode serve`)
3. Wait 5s and verify health
4. Launch the Telegram listener

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with command list |
| `/help` | Detailed help with all available commands |
| `/new` | Clear the current OpenCode session and start fresh |
| `/status` | Show server health and uptime |
| `/restart` | Restart the OpenCode server process |

## Message Types

### Text
Any text message not starting with `/` or `^` is forwarded to OpenCode. The bot:
1. Retrieves or creates a session for your chat
2. Sends the text to OpenCode
3. Returns the response (split into 4096-character chunks if needed)

### Photos
When you send a photo:
1. The bot downloads it to `storage/temp/`
2. Sends a prompt to OpenCode with the image path
3. The AI agent can analyze the image

### Documents
When you send a document:
1. The bot downloads it to `storage/temp/` (filename sanitized)
2. Sends a prompt to OpenCode with the file path
3. The AI agent can read and process the file

### Voice Messages
When you send a voice message:
1. The bot downloads the OGG audio to `storage/temp/`
2. Transcribes it using `faster-whisper` (local, CPU, model "small")
3. Sends the transcription to OpenCode
4. The AI agent responds based on the transcribed text

## CLI Commands

```bash
python -m src.cli check    # Run pre-flight validation
python -m src.cli setup    # Create .env and storage dirs
python -m src.cli start    # Start the bot
python -m src.cli test     # Run test suite with coverage
```

## Security Notes

- The bot only responds to `ALLOWED_CHAT_ID` — all other chats get "Access denied"
- File downloads use `safe_path()` to prevent path traversal
- Sensitive files (`.env`, SSH keys, `.pem`, etc.) are blocked from download
- `storage/temp/` is cleaned at startup (files >1h old)
