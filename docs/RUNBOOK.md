# Operator Runbook

Quick reference for common operational issues with the OpenCode Agents Bot.

---

## Scenario: Bot Won't Start

### Symptoms
- `npm start` exits immediately with an error
- Telegram shows the bot as offline

### Checklist

1. **Verify `TELEGRAM_BOT_TOKEN`**
   ```bash
   # Should look like: 123456789:ABCdefGHIjklMNOpqrSTUvwxyz
   cat .env | grep TELEGRAM_BOT_TOKEN
   ```
   - Must not contain quotes, spaces, or newlines
   - Must match the format `\d+:[A-Za-z0-9_-]+`
   - Regenerate at [@BotFather](https://t.me/BotFather) if unsure

2. **Check `.env` override behavior**
   - `bot.config.ts` loads `.env` with `override: true`
   - If you set variables in your shell environment, they take precedence over `.env`
   - Run `echo $TELEGRAM_BOT_TOKEN` (Linux/macOS) or `echo %TELEGRAM_BOT_TOKEN%` (Windows) to check

3. **Check port 4096**
   - Another process may be blocking the OpenCode server port
   - `ProcessManager.start()` auto-detects and kills stray processes, but if it lacks permissions you may need manual cleanup
   - See ["Port 4096 is occupied"](#scenario-port-4096-is-occupied) below

4. **Check build artifacts**
   ```bash
   npm run build
   ```
   - Ensure `dist/` exists and is up to date

---

## Scenario: OpenCode Server Keeps Crashing

### Symptoms
- `/status` shows `failed` or `unhealthy`
- `startCount` increments rapidly
- Console shows repeated `[ProcessManager] process exited with code X`

### Checklist

1. **Check the circuit breaker**
   - `restart()` blocks after 3 attempts per minute (default)
   - If blocked, state will be `failed` and the error message will say "Too many restarts"
   - Wait 60 seconds before trying again, or fix the underlying issue first

2. **Inspect `data/process-state.json`**
   ```bash
   cat data/process-state.json
   ```
   Look for:
   - `lastExitCode` — non-zero values indicate the child crashed (check OpenCode CLI logs)
   - `consecutiveFailures` — high numbers suggest the server starts but fails health checks
   - `status` cycling between `starting` → `unhealthy` → `starting`

3. **Check OpenCode CLI output**
   - `ProcessManager` forwards stdout/stderr prefixed with `[opencode-serve]`
   - Look for missing config, bad project path, or port-binding errors

4. **Verify project directory**
   - Ensure `OPENCODE_PROJECT_DIR` exists and contains a valid `opencode.json`
   - If unset, it defaults to the current working directory

---

## Scenario: Port 4096 is Occupied

### Symptoms
- `[ProcessManager] port 4096 is occupied, cleaning up...`
- Server fails to start even though no bot process appears to be running

### Automatic Handling
`ProcessManager.start()` already performs the following on port conflict:

1. Probes the port with a TCP connect
2. Queries OS tools to find the owning PID
3. Kills the PID
4. Waits 2 seconds before spawning

### Manual Cleanup

If automatic cleanup fails (permission denied, zombie process, etc.):

**Windows:**
```cmd
netstat -ano | findstr :4096
taskkill /PID <PID> /F
```

**Linux/macOS:**
```bash
lsof -t -i:4096
kill -9 <PID>
```

If you cannot find a PID but the port is still in use, the socket may be in `TIME_WAIT`. Wait 30–60 seconds for the OS to release it, or change `OPENCODE_SERVER_PORT` in `opencode.json` / `.env`.

---

## Scenario: Restart Loop

### Symptoms
- `/restart` returns "Restart failed: Too many restarts (3 in the last minute). Wait a minute or check the server configuration."
- `data/process-state.json` shows `"status": "failed"`

### Resolution

1. **Wait 60 seconds**
   - The circuit breaker uses a rolling 60-second window
   - After the oldest restart timestamp falls outside the window, restarts are allowed again

2. **Investigate the root cause**
   - Check `lastExitCode` in `data/process-state.json`
   - Review `[opencode-serve]` stderr in the bot logs
   - Ensure `opencode serve` can start manually:
     ```bash
     cd <OPENCODE_PROJECT_DIR>
     opencode serve --port 4096 --hostname 127.0.0.1
     ```

3. **Adjust limits (if necessary)**
   - Edit the `maxRestartsPerMinute` value passed to `new ProcessManager(...)` in `src/bot/TelegramBot.ts`
   - Rebuild and restart

---

## Scenario: Health Check Returns 401

### Symptoms
- `/status` shows `running` but latency is high or health checks are failing
- Console logs: `[ProcessManager] health check returned 401`

### Resolution

The OpenCode server has Basic Auth enabled. `ProcessManager` sends credentials only when `serverPassword` is set.

1. **Set the password in `.env`**
   ```env
   OPENCODE_SERVER_PASSWORD=your-secure-password
   ```

2. **Verify username (if customized)**
   ```env
   OPENCODE_SERVER_USERNAME=opencode
   ```

3. **Restart the bot**
   ```bash
   npm run build && npm start
   ```

> **Note:** A `401` response is actually treated as a successful health check internally (the server is alive), but if you see repeated 401s and the dashboard is inaccessible, the credentials are mismatched.

---

## Reading `data/process-state.json`

This file is human-readable JSON updated atomically after every state transition.

### Example

```json
{
  "status": "running",
  "pid": 18432,
  "uptimeMs": 125000,
  "lastHealthCheck": "2026-05-08T14:46:00.000Z",
  "consecutiveFailures": 0,
  "startCount": 2,
  "lastExitCode": null
}
```

### Field Reference

| Field | Type | Meaning |
|-------|------|---------|
| `status` | string | Current lifecycle state |
| `pid` | number \| null | OS process ID when running |
| `uptimeMs` | number \| null | Milliseconds since last successful start |
| `lastHealthCheck` | ISO date \| null | Timestamp of last health check attempt |
| `consecutiveFailures` | number | Failed health checks since last success |
| `startCount` | number | Total starts this session |
| `lastExitCode` | number \| null | Exit code from last process termination |

### Diagnostics

| Pattern | Interpretation |
|---------|----------------|
| `status: "failed"`, `lastExitCode: 1` | Child process crashed on startup |
| `status: "unhealthy"`, `consecutiveFailures: 5` | Server started but is not responding to health checks |
| `startCount` increasing, `status` never `running` | Likely port conflict or missing OpenCode CLI |
| `lastHealthCheck` is stale (> 60s) | Health check interval may be blocked or process is hung |

---

## Running Tests

### Quick Run

```bash
npm test
```

Runs Vitest in non-interactive mode. The suite covers:

- `ProcessStateStore`
  - Persist and reload state
  - Corruption handling (malformed JSON falls back to defaults)
  - Atomic writes (temp + rename)
- `ProcessManager`
  - Health header generation (Basic Auth)
  - Circuit breaker logic (3 restarts / 60s)
  - State change callbacks
  - Health snapshot recording

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Interpreting Results

- **All green:** system is healthy
- **State store failures:** check disk permissions in `./data/`
- **Circuit breaker failures:** likely a logic regression in `restart()`
- **Health snapshot failures:** verify `fetch` mocking in tests

---

## Emergency Shutdown Procedure

If the bot or child process becomes unresponsive:

1. **First Ctrl+C** (SIGINT)
   - The application catches SIGINT/SIGTERM
   - `ProcessManager.stop()` is triggered
   - Graceful shutdown begins (up to `gracefulShutdownTimeoutMs`)

2. **Second Ctrl+C** (double signal)
   - Detected as a repeated signal within the handler
   - Application forces `process.exit(1)` immediately
   - Use this if graceful shutdown hangs

3. **Manual kill (if Ctrl+C fails)**

   **Windows:**
   ```cmd
   taskkill /IM node.exe /F
   ```

   **Linux/macOS:**
   ```bash
   pkill -9 -f "dist/index.js"
   ```

4. **Clean up state file (optional)**
   ```bash
   rm data/process-state.json
   ```
   - On next start, `ProcessStateStore` will recreate it with default values

---

## Contact & Escalation

- Review [AGENTS.md](../AGENTS.md) for project conventions and agent inventory
- See [ProcessManager API Reference](./ProcessManager.md) for programmatic control details
