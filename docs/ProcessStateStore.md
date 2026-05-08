# ProcessStateStore API Reference

JSON-backed, atomic state persistence for the `opencode serve` child process lifecycle. `ProcessStateStore` mirrors the `SessionStore` pattern and writes atomically (temp file + rename) to avoid corruption during crashes.

## Overview

`ProcessStateStore` is used internally by `ProcessManager` to persist process status, PID, uptime, and health-check history across restarts. It is designed to be human-readable (formatted JSON) and resilient to crashes or disk errors.

**Responsibilities:**
- Load state from disk on construction (or start with defaults if missing/corrupt).
- Persist state atomically after every transition.
- Return immutable clones to prevent accidental in-memory mutations.

## Constructor

```typescript
import { ProcessStateStore } from "./process/ProcessStateStore.js";

const store = new ProcessStateStore();           // uses env or default path
const store2 = new ProcessStateStore("./custom/process-state.json");
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `filePath` | `string` | No | `process.env.PROCESS_STATE_PATH \|\| "./data/process-state.json"` | Path to the JSON state file |

## Interface: `ProcessState`

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

### Field Reference

| Field | Type | Meaning |
|-------|------|---------|
| `status` | string | Current lifecycle state. See [`ProcessManager` state machine](./ProcessManager.md#state-machine). |
| `pid` | `number \| null` | OS process ID when running. |
| `uptimeMs` | `number \| null` | Milliseconds since last successful start. |
| `lastHealthCheck` | `Date \| null` | Timestamp of the last health check attempt. |
| `consecutiveFailures` | `number` | Failed health checks since last success. |
| `startCount` | `number` | Total starts in the current process lifetime. |
| `lastExitCode` | `number \| null` | Exit code from the last process termination. |

## Methods

### `getState(): ProcessState`

Returns a **deep clone** of the current in-memory state. Mutating the returned object does not affect the store.

```typescript
const state = store.getState();
console.log(state.status); // "running"
```

---

### `save(state: ProcessState): void`

Persists the given state to disk atomically.

**Atomic write strategy:**
1. Serialize state to JSON.
2. Write to a temporary file (`<path>.tmp`).
3. Rename the temp file over the target path.

If the parent directory does not exist, it is created recursively.

```typescript
store.save({
  status: "running",
  pid: 18432,
  uptimeMs: 125000,
  lastHealthCheck: new Date(),
  consecutiveFailures: 0,
  startCount: 2,
  lastExitCode: null,
});
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| **File does not exist** | Silently initializes with default state (`status: "stopped"`, all counters at `0`/`null`). |
| **Corrupt / invalid JSON** | Silently falls back to default state. The corrupt file is **not** overwritten until the next `save()` call. |
| **Directory missing** | Automatically created via `mkdirSync(..., { recursive: true })` on the first `save()`. |
| **Disk full / permission denied** | The underlying `fs` call throws. This is propagated to the caller (typically `ProcessManager.setState()`). |

## Default State

When no file exists or the file is corrupt, the store returns:

```json
{
  "status": "stopped",
  "pid": null,
  "uptimeMs": null,
  "lastHealthCheck": null,
  "consecutiveFailures": 0,
  "startCount": 0,
  "lastExitCode": null
}
```

## Serialization Notes

`Date` objects are serialized to ISO-8601 strings (`"2026-05-08T14:46:00.000Z"`) and deserialized back to `Date` instances on load. This makes the on-disk file human-readable and easy to inspect with standard tools.

## File Location

Default path (unless overridden by constructor argument or `PROCESS_STATE_PATH` environment variable):

```
./data/process-state.json
```

## See Also

- [`ProcessManager` API Reference](./ProcessManager.md)
- [Operator Runbook](./RUNBOOK.md) — operational diagnostics using `data/process-state.json`
