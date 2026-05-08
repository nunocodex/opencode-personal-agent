import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { dirname, resolve } from "path";

export interface ProcessState {
  status: "stopped" | "starting" | "running" | "unhealthy" | "restarting" | "failed";
  pid: number | null;
  uptimeMs: number | null;
  lastHealthCheck: Date | null;
  consecutiveFailures: number;
  startCount: number;
  lastExitCode: number | null;
}

const DEFAULT_STATE: ProcessState = {
  status: "stopped",
  pid: null,
  uptimeMs: null,
  lastHealthCheck: null,
  consecutiveFailures: 0,
  startCount: 0,
  lastExitCode: null,
};

function cloneState(state: ProcessState): ProcessState {
  return {
    status: state.status,
    pid: state.pid,
    uptimeMs: state.uptimeMs,
    lastHealthCheck: state.lastHealthCheck,
    consecutiveFailures: state.consecutiveFailures,
    startCount: state.startCount,
    lastExitCode: state.lastExitCode,
  };
}

function serialize(state: ProcessState): Record<string, unknown> {
  return {
    status: state.status,
    pid: state.pid,
    uptimeMs: state.uptimeMs,
    lastHealthCheck: state.lastHealthCheck?.toISOString() ?? null,
    consecutiveFailures: state.consecutiveFailures,
    startCount: state.startCount,
    lastExitCode: state.lastExitCode,
  };
}

function deserialize(data: Record<string, unknown>): ProcessState {
  return {
    status: (data.status as ProcessState["status"]) ?? "stopped",
    pid: (data.pid as number | null) ?? null,
    uptimeMs: (data.uptimeMs as number | null) ?? null,
    lastHealthCheck: data.lastHealthCheck ? new Date(data.lastHealthCheck as string) : null,
    consecutiveFailures: (data.consecutiveFailures as number) ?? 0,
    startCount: (data.startCount as number) ?? 0,
    lastExitCode: (data.lastExitCode as number | null) ?? null,
  };
}

export class ProcessStateStore {
  private filePath: string;
  private state: ProcessState;

  constructor(filePath?: string) {
    this.filePath = resolve(filePath ?? process.env.PROCESS_STATE_PATH ?? "./data/process-state.json");
    this.state = cloneState(DEFAULT_STATE);
    this.load();
  }

  private load(): void {
    if (!existsSync(this.filePath)) {
      return;
    }
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      this.state = deserialize(data);
    } catch {
      // ignore corrupt file, keep default
    }
  }

  save(state: ProcessState): void {
    this.state = cloneState(state);
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(serialize(state), null, 2));
    renameSync(tempPath, this.filePath);
  }

  getState(): ProcessState {
    return cloneState(this.state);
  }
}
