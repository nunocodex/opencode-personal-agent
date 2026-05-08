# ProcessManager API Reference

Centralized lifecycle manager for the `opencode serve` child process. Handles spawning, health checking, graceful shutdown, restart circuit breaking, and state persistence.

## Overview

`ProcessManager` is designed to be instantiated once per application lifecycle (inside `startBot()`) and exported for graceful shutdown. It encapsulates all process-related concerns so that `TelegramBot` and `CommandHandler` only interact with a high-level API.

**Responsibilities:**
- Idempotent `start()` with port conflict detection
- Graceful `stop()` with SIGTERM → SIGKILL escalation (Windows `taskkill` fallback)
- `restart()` with circuit breaker protection
- Periodic and on-demand HTTP health checks with optional Basic Auth
- State tracking and callback subscriptions
- Health snapshot history (last 100 checks)

## Constructor

```typescript
import { ProcessManager } from "./process/ProcessManager.js";

const pm = new ProcessManager({
  serverUrl: "http://127.0.0.1:4096",
  projectDir: "/path/to/project",
  serverPort: 4096,
  serverHost: "127.0.0.1",
  healthCheckIntervalMs: 30_000,
  maxConsecutiveFailures: 5,
  maxRestartsPerMinute: 3,
  gracefulShutdownTimeoutMs: 5_000,
  serverUsername: "opencode",
  serverPassword: "secret",
});
```

### `ProcessManagerOptions`

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `serverUrl` | `string` | Yes | — | Full URL of the OpenCode HTTP server (used for health checks) |
| `projectDir` | `string` | Yes | — | Working directory for the child process |
| `serverPort` | `number` | Yes | — | TCP port the server binds to |
| `serverHost` | `string` | Yes | — | Hostname the server binds to |
| `healthCheckIntervalMs` | `number` | No | `30000` | Interval between automatic health checks |
| `maxConsecutiveFailures` | `number` | No | `5` | Threshold of consecutive failures before marking unhealthy |
| `maxRestartsPerMinute` | `number` | No | `3` | Circuit breaker: max restarts allowed within 60 seconds |
| `gracefulShutdownTimeoutMs` | `number` | No | `5000` | Milliseconds to wait after SIGTERM before escalating to SIGKILL |
| `serverUsername` | `string` | No | `"opencode"` | Basic Auth username for health checks |
| `serverPassword` | `string` | No | — | Basic Auth password for health checks |

## Methods

### `start(): Promise<void>`

Spawns `opencode serve` as a child process if it is not already running and healthy.

**Idempotent behavior:**
- If the process is already running and responds to health checks, resolves immediately.
- If the target port is occupied by a stray process, it is detected and killed before spawning.
- Any existing zombie process is killed before a new one is started.

**Throws:**
- `Error("Cannot start while stopping")` if a stop is in progress.
- `Error("opencode serve is not responding after 5s")` if the server does not pass a health check within 5 seconds of spawning.

**Side effects:**
- State transitions: `stopped` → `starting` → `running` (or `failed`)
- `startCount` is incremented
- `consecutiveFailures` is reset to 0

---

### `stop(): Promise<void>`

Gracefully shuts down the child process.

**Escalation sequence:**
1. Send `SIGTERM`
2. Poll every 200ms until process exits or `gracefulShutdownTimeoutMs` elapses
3. On Windows: attempt `taskkill /PID <pid> /F`
4. Final fallback: `SIGKILL` (or `taskkill` if step 3 failed)
5. Wait 500ms for the OS to reap the process

**Idempotent behavior:**
- If no process is running, resolves immediately after setting state to `stopped`.

**Side effects:**
- State transitions: `running` → `stopped`
- `stopping` flag prevents concurrent `start()` calls

---

### `restart(): Promise<void>`

Stops and then starts the process, with circuit breaker protection.

**Circuit breaker logic:**
- Maintains a rolling window of restart timestamps (last 60 seconds)
- If `restartTimestamps.length >= maxRestartsPerMinute`, throws an error and transitions to `failed`
- Otherwise, records the timestamp and proceeds

**Throws:**
- `Error("Too many restarts (N in the last minute). Wait a minute or check the server configuration.")`

**Side effects:**
- State transitions: `running` → `restarting` → `stopped` → `starting` → `running` (or `failed`)

---

### `isHealthy(): Promise<boolean>`

Performs a synchronous HTTP health check against `${serverUrl}/global/health`.

**Behavior:**
- Uses `AbortSignal.timeout(5000)` to cap request duration
- Sends `Authorization: Basic <creds>` header when `serverPassword` is configured
- Records a `HealthSnapshot` with `healthy`, `timestamp`, and `latencyMs`
- Updates `consecutiveFailures` (reset on success, +1 on failure)

**Returns:**
- `true` if the response is OK (2xx)
- `false` on network error, timeout, or non-OK response

> **Note:** A `401 Unauthorized` response is treated as a successful health check (`res.ok` is not required for 401) because it proves the server is listening.

---

### `getState(): ProcessState`

Returns a snapshot of the current process state, including live `uptimeMs` calculation.

```typescript
interface ProcessState {
  status: "stopped" | "starting" | "running" | "unhealthy" | "restarting" | "failed";
  pid: number | null;
  uptimeMs: number | null;
  lastHealthCheck: Date | null;
  consecutiveFailures: number;
  startCount: number;
  lastExitCode: number | null;
}
```

---

### `getHealthHistory(limit?: number): HealthSnapshot[]`

Returns the last 100 health check snapshots (or fewer if `limit` is provided).

```typescript
interface HealthSnapshot {
  healthy: boolean;
  timestamp: Date;
  latencyMs: number;
}
```

---

### `onStateChange(callback: (state: ProcessState) => void): () => void`

Subscribes to state transitions. The callback is invoked every time `setState()` detects a change.

**Returns:** an unsubscribe function.

```typescript
const unsubscribe = pm.onStateChange((state) => {
  console.log("State changed to:", state.status);
});

// Later...
unsubscribe();
```

> **Note:** Callback errors are caught and logged to `console.error` without re-throwing, so one bad subscriber cannot break the state machine.

## State Machine

```
                    +-----------+
                    |  stopped  |
                    +----+------+
                         |
              start()    |
                         v
                    +-----------+
                    | starting  |
                    +----+------+
                         |
              health OK  |   health FAIL
                +--------+--------+
                |                 |
                v                 v
           +---------+      +---------+
           | running |      | failed  |
           +----+----+      +----+----+
                |                 |
           stop()|           start()
                |                 |
                v                 |
           +---------+            |
           | stopped |<-----------+
           +----+----+
                |
         process crash
                |
                v
           +---------+
           |unhealthy|
           +----+----+
                |
           restart()
                |
                v
           +----------+
           |restarting|
           +----+-----+
                |
                +-------> stopped  (after stop() + start())
```

### State Descriptions

| State | Meaning |
|-------|---------|
| `stopped` | No child process is running. Initial state on boot. |
| `starting` | `start()` was called; process spawned but not yet confirmed healthy. |
| `running` | Process spawned and passed the initial 5-second health check. |
| `unhealthy` | The process exited unexpectedly (not via `stop()`). |
| `restarting` | `restart()` was called; `stop()` is in progress before re-spawning. |
| `failed` | Startup health check failed, or circuit breaker/max restarts exceeded. |

## Error Conditions

| Scenario | Behavior |
|----------|----------|
| **Port already in use** | Detected via TCP connect probe; stray PIDs are looked up with `netstat`/`lsof` and killed before spawning. |
| **Spawn error** | Child fails to launch (e.g., `opencode` not in PATH). State → `failed`. Error logged. |
| **Process exits during startup** | `close` event fires before health check. State → `unhealthy` (or `stopped` if `stopping` is true). |
| **Health check timeout** | `fetch()` throws or `AbortSignal` fires. Snapshot recorded as unhealthy; `consecutiveFailures` increments. |
| **401 Unauthorized from health endpoint** | Treated as healthy (server is alive), but `res.ok` is false. No failure increment. |
| **Restart storm** | Circuit breaker blocks after `maxRestartsPerMinute` within 60s. Throws error; state → `failed`. |
| **Stop during start** | `start()` throws `"Cannot start while stopping"`. |
| **Double SIGINT/SIGTERM** | Handled at application level (`index.ts`). Second signal forces `process.exit(1)` to avoid hangs. |

## Platform Differences

| Concern | Linux/macOS | Windows |
|---------|-------------|---------|
| Spawn command | `opencode serve ...` | `opencode.cmd serve ...` |
| Shell | `shell: false` | `shell: true` |
| Port cleanup | `lsof -t -i:<port>` + `kill -9` | `netstat -ano` + `taskkill /F` |
| Graceful kill | `SIGTERM` → `SIGKILL` | `SIGTERM` → `taskkill /F` → `SIGKILL` |

## See Also

- [ProcessStateStore API](./ProcessStateStore.md)
- [Operator Runbook](./RUNBOOK.md)
