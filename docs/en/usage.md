# Usage

Complete usage guide for the OpenCode Personal Agent Telegram bot.

## Starting the Bot

```bash
python -m src.cli start
```

Or via launcher scripts:

**Windows:**

```powershell
.\run.ps1
```

**Linux/macOS:**

```bash
./run.sh
```

### Startup Sequence

When you start the bot, it performs these steps:

1. **Pre-flight checks** — Validates Python version, `.env` file, configuration, and `opencode` in PATH
2. **Storage setup** — Creates `storage/` directories if missing
3. **Temp cleanup** — Removes temporary files older than 1 hour
4. **Server start** — Launches `opencode serve` as a subprocess
5. **Health check** — Waits 5 seconds, then verifies server health via `/global/health`
6. **Bot listener** — Starts the Telegram bot listener

### Stopping the Bot

Press `Ctrl+C` to stop. The bot will:
- Stop the Telegram listener
- Terminate the OpenCode server process (SIGTERM, then SIGKILL after 5s timeout)
- Clean up resources

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with command list |
| `/help` | Detailed help with all available commands |
| `/new` | Clear current session and start fresh |
| `/status` | Show server health and uptime |
| `/restart` | Restart the OpenCode server process |

### Command Details

#### /start

Sends a welcome message with a list of available commands.

**Response:**
```
Welcome to OpenCode Agents Bot!

Available commands:
/help - Show this help message
/new - Start a new session
/status - Check server status
/restart - Restart the server

Send me any message to interact with AI agents.
```

#### /help

Shows detailed help with all available commands and features.

#### /new

Clears the current OpenCode session and starts fresh.

**Use when:**
- You want to start a new conversation context
- Previous responses are affecting current tasks
- You're switching to a completely different topic

**Response:**
```
Session cleared. Starting fresh!
```

#### /status

Shows server health status and uptime.

**Response:**
```
Server Status: Healthy
Uptime: 2h 34m 12s
PID: 12345
```

#### /restart

Restarts the OpenCode server process.

**Use when:**
- Server becomes unresponsive
- After configuration changes
- To clear server state

**Response:**
```
Restarting server...
Server restarted successfully.
```

## Message Types

The bot handles four types of messages:

### Text Messages

Any text message not starting with `/` or `^` is forwarded to OpenCode.

**Processing flow:**
1. Bot retrieves or creates a session for your chat
2. Sends the text to OpenCode API
3. Receives streaming response
4. Returns the response (split into 4096-character chunks if needed)

**Example:**
```
You: "Build a Python function to calculate fibonacci numbers"
Bot: [AI response with code]
```

### Photos

When you send a photo:

**Processing flow:**
1. Bot downloads the photo to `storage/temp/`
2. Sends a prompt to OpenCode with the image path
3. AI agent analyzes the image (using file-parser agent for vision)
4. Returns analysis results

**Example:**
```
You: [sends photo of a document]
You: "Extract the text from this image"
Bot: [OCR results and analysis]
```

**Use cases:**
- Screenshot analysis
- Document OCR
- Diagram interpretation
- Code screenshot explanation

### Documents

When you send a document:

**Processing flow:**
1. Bot downloads the document to `storage/temp/` (filename sanitized)
2. Sends a prompt to OpenCode with the file path
3. AI agent reads and processes the file
4. Returns analysis or modifications

**Supported formats:**
- Text files (`.txt`, `.md`, `.json`, `.yaml`, etc.)
- Code files (`.py`, `.js`, `.ts`, `.java`, `.go`, etc.)
- Documents (`.pdf`, `.docx` — when supported by agent)

**Example:**
```
You: [sends config.json]
You: "Review this configuration for security issues"
Bot: [Security analysis and recommendations]
```

### Voice Messages

When you send a voice message:

**Processing flow:**
1. Bot downloads the OGG audio to `storage/temp/`
2. Transcribes using `faster-whisper` (local, CPU, model "small", int8)
3. Sends the transcription to OpenCode
4. AI agent responds based on transcribed text

**Privacy:** Voice transcription is 100% local. No audio is sent to cloud APIs.

**Example:**
```
You: [sends voice message: "How do I implement async/await in Python?"]
Bot: [Transcription: "How do I implement async/await in Python?"]
Bot: [AI response explaining async/await]
```

**Language support:** Configure `WHISPER_LANGUAGE` in `.env`:
- `auto` — Automatic language detection (default)
- `en` — English
- `it` — Italian
- `es` — Spanish
- `fr` — French
- `de` — German
- And many more

## Agent Interaction Patterns

### Default Agent

By default, the `build` agent handles all requests.

### Specifying an Agent

To use a specific agent, mention it in your prompt:

```
"Using the review agent: analyze this code for security vulnerabilities"
```

### Agent Selection by Task

| Task Type | Recommended Agent |
|-----------|-------------------|
| Building new code | `build` |
| Planning architecture | `plan` or `planner` |
| Understanding codebase | `explore` |
| Finding files | `scout` |
| Complex multi-step tasks | `orchestrator` |
| Modifying existing code | `codebase` |
| Code review | `review` |
| Documentation | `docs` |
| Engineering advice | `em-advisor` |
| Content creation | `blogger` |
| Critical feedback | `brutal-critic` |
| Legal questions | `legal-advisor` |
| File analysis | `file-parser` |

### Using Skills

Skills are automatically applied based on context. To explicitly request a skill:

```
"Using the python skill: write a function to parse JSON with validation"
```

### Combining Agents and Skills

For best results, combine agents with relevant skills:

```
"Using the docs agent with the python skill: generate API documentation
for this module with proper docstrings"
```

## Use Case Examples

### Code Development

```
Prompt: "Build a Python CLI tool for task management with add, list, and complete commands"
Agent: build (with python skill)
Expected: Working Python code with argparse, file storage, and CLI commands
```

### Architecture Planning

```
Prompt: "Plan the architecture for a microservice that processes invoices"
Agent: plan
Expected: Component diagram, technology recommendations, API design
```

### Code Review

```
Prompt: "Review this code for security vulnerabilities"
[attach code file]
Agent: review
Expected: Security findings, vulnerability report, fix suggestions
```

### Documentation

```
Prompt: "Generate API documentation for the OpenCode client module"
Agent: docs
Expected: Markdown documentation with endpoints, parameters, examples
```

### File Analysis

```
Prompt: "Analyze this screenshot and extract the error message"
[attach screenshot]
Agent: file-parser
Expected: Extracted text, error explanation, suggested fixes
```

### Content Creation

```
Prompt: "Write a LinkedIn post about launching my new open source project"
Agent: blogger
Expected: Engaging social media post with hashtags and call-to-action
```

### Legal Guidance

```
Prompt: "What licenses should I consider for an open source AI tool?"
Agent: legal-advisor
Expected: License comparison, recommendations, considerations
```

### Database Design

```
Prompt: "Write a SQL migration to add an index on users.email"
Agent: build (with sql-migrations skill)
Expected: Safe migration with rollback capability
```

### UI Development

```
Prompt: "Create a responsive React dashboard component with charts"
Agent: build (with react-next skill)
Expected: React component with responsive design and chart integration
```

### Career Content

```
Prompt: "Optimize my resume for ATS systems"
[attach resume]
Agent: blogger (with career-content skill)
Expected: ATS-optimized resume with keyword suggestions
```

## CLI Commands

The bot provides CLI commands for management:

```bash
python -m src.cli check    # Run pre-flight validation
python -m src.cli setup    # Create .env and storage directories
python -m src.cli start    # Start the bot
python -m src.cli test     # Run test suite with coverage
```

### Testing

```bash
# Run full test suite with coverage
python -m src.cli test

# Or directly with pytest
pytest tests/ --cov=src -v

# Test a single file
python -m pytest tests/test_bot.py -v
```

## Rate Limiting

The bot enforces a rate limit between messages (default: 2.0 seconds).

**Purpose:** Prevent API overload and ensure stable processing.

**Configuration:** Set `rate_limit_seconds` in `.env` to adjust.

## File Size Limits

Maximum file size: 50MB (default).

**Configuration:** Set `max_file_size` in `.env` to adjust.

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Access denied" | Chat ID doesn't match `ALLOWED_CHAT_ID` | Verify your chat ID in `.env` |
| "Server unavailable" | OpenCode server not running | Use `/restart` command |
| "File too large" | File exceeds `max_file_size` | Reduce file size or increase limit |
| "Rate limited" | Messages sent too quickly | Wait between messages |

### JSON Response Handling

When OpenCode returns tool-use errors or raw JSON (e.g., from `file-parser` agent), the bot detects JSON responses and sends them as plain text to avoid Telegram Markdown parsing errors.

## Session Management

Sessions are stored **in memory only** (`dict[int, str]`).

**Implications:**
- Bot restart = fresh session state
- No persistent conversation history
- Each chat has one active session

Use `/new` to manually clear your session.

## Best Practices

1. **Be specific** — Clear prompts get better results
2. **Use appropriate agents** — Match agent to task type
3. **Leverage skills** — Request domain-specific skills when relevant
4. **Start fresh when needed** — Use `/new` for context switches
5. **Check status regularly** — Use `/status` to monitor server health
6. **Attach relevant files** — Photos and documents enhance AI understanding

## Next Steps

- Review [Agents & Skills](agents.md) for detailed agent and skill reference
- Check [Security](security.md) for security model details
- Explore [Architecture](architecture.md) for system internals
