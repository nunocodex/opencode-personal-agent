import { spawn, exec } from "child_process";
import { promisify } from "util";
import { createConnection } from "net";
import { ProcessState, ProcessStateStore } from "./ProcessStateStore.js";

const execAsync = promisify(exec);

function isPortInUse(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection(port, host);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(2000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function killProcessOnPort(port: number): Promise<void> {
  if (process.platform === "win32") {
    try {
      const { stdout } = await execAsync(
        `netstat -ano | findstr :${port}`
      );
      const lines = stdout.split("\n").filter((l) => l.includes(`:${port}`));
      const pids = new Set<number>();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(pid)) pids.add(pid);
      }
      for (const pid of pids) {
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`[ProcessManager] killed PID ${pid} on port ${port}`);
        } catch {
          // ignore
        }
      }
    } catch {
      // no process found
    }
  } else {
    try {
      const { stdout } = await execAsync(`lsof -t -i:${port}`);
      const pids = stdout
        .trim()
        .split("\n")
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n));
      for (const pid of pids) {
        try {
          process.kill(pid, "SIGKILL");
          console.log(`[ProcessManager] killed PID ${pid} on port ${port}`);
        } catch {
          // ignore
        }
      }
    } catch {
      // no process found
    }
  }
}

export interface HealthSnapshot {
  healthy: boolean;
  timestamp: Date;
  latencyMs: number;
}

export interface ProcessManagerOptions {
  serverUrl: string;
  projectDir: string;
  serverPort: number;
  serverHost: string;
  healthCheckIntervalMs?: number;
  maxConsecutiveFailures?: number;
  maxRestartsPerMinute?: number;
  gracefulShutdownTimeoutMs?: number;
  serverPassword?: string;
  serverUsername?: string;
}

export class ProcessManager {
  private options: ProcessManagerOptions;
  private store: ProcessStateStore;
  private state: ProcessState;
  private child: ReturnType<typeof spawn> | null = null;
  private startTime: number | null = null;
  private stateCallbacks: Array<(state: ProcessState) => void> = [];
  private healthHistory: HealthSnapshot[] = [];
  private stopping = false;
  private restartTimestamps: number[] = [];

  constructor(options: ProcessManagerOptions) {
    this.options = {
      healthCheckIntervalMs: 30_000,
      maxConsecutiveFailures: 5,
      maxRestartsPerMinute: 3,
      gracefulShutdownTimeoutMs: 5_000,
      ...options,
    };
    this.store = new ProcessStateStore();
    this.state = this.store.getState();
    // Reset transient fields on load
    this.state.status = "stopped";
    this.state.pid = null;
    this.state.uptimeMs = null;
    this.state.lastHealthCheck = null;
    this.state.consecutiveFailures = 0;
    this.state.lastExitCode = null;
    this.persistState();
  }

  private healthHeaders(): Record<string, string> {
    const password = this.options.serverPassword;
    const username = this.options.serverUsername ?? "opencode";
    const headers: Record<string, string> = {};
    if (password) {
      const creds = Buffer.from(`${username}:${password}`).toString("base64");
      headers["Authorization"] = `Basic ${creds}`;
    }
    return headers;
  }

  private setState(partial: Partial<ProcessState>): void {
    const previous = JSON.stringify(this.state);
    this.state = { ...this.state, ...partial };
    if (previous !== JSON.stringify(this.state)) {
      this.persistState();
      for (const cb of this.stateCallbacks) {
        try {
          cb(this.getState());
        } catch (err) {
          console.error("[ProcessManager] state change callback error:", err);
        }
      }
    }
  }

  private persistState(): void {
    this.store.save(this.state);
  }

  private getUptimeMs(): number | null {
    if (!this.startTime) return null;
    return Date.now() - this.startTime;
  }

  async start(): Promise<void> {
    if (this.stopping) {
      throw new Error("Cannot start while stopping");
    }

    // Idempotent: if already running and healthy, resolve immediately
    if (this.child && !this.child.killed && this.state.status === "running") {
      const healthy = await this.isHealthy();
      if (healthy) {
        console.log("[ProcessManager] already running and healthy");
        return;
      }
    }

    // Check for port conflicts and kill any stray process
    const portInUse = await isPortInUse(this.options.serverPort, this.options.serverHost);
    if (portInUse) {
      console.log(`[ProcessManager] port ${this.options.serverPort} is occupied, cleaning up...`);
      await killProcessOnPort(this.options.serverPort);
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Kill any existing zombie
    await this.killExisting();

    this.setState({ status: "starting", lastExitCode: null });
    console.log("[ProcessManager] starting opencode serve...");

    const isWindows = process.platform === "win32";

    if (isWindows) {
      const cmd = [
        "opencode.cmd",
        "serve",
        "--port",
        String(this.options.serverPort),
        "--hostname",
        this.options.serverHost,
      ]
        .map((a) => JSON.stringify(a))
        .join(" ");
      this.child = spawn(cmd, {
        cwd: this.options.projectDir,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      });
    } else {
      this.child = spawn(
        "opencode",
        ["serve", "--port", String(this.options.serverPort), "--hostname", this.options.serverHost],
        {
          cwd: this.options.projectDir,
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
          shell: false,
        }
      );
    }

    const pid = this.child.pid ?? null;
    this.startTime = Date.now();
    this.setState({
      status: "starting",
      pid,
      startCount: this.state.startCount + 1,
      uptimeMs: 0,
      consecutiveFailures: 0,
    });

    this.child.stdout?.on("data", (d: Buffer) => {
      const line = d.toString().trim();
      if (line) console.log("[opencode-serve]", line);
    });

    this.child.stderr?.on("data", (d: Buffer) => {
      const line = d.toString().trim();
      if (line) console.error("[opencode-serve]", line);
    });

    this.child.on("close", (code) => {
      console.log(`[ProcessManager] process exited with code ${code}`);
      this.child = null;
      this.startTime = null;
      this.setState({
        status: this.stopping ? "stopped" : "unhealthy",
        pid: null,
        uptimeMs: null,
        lastExitCode: code ?? null,
      });
    });

    this.child.on("error", (err) => {
      console.error("[ProcessManager] spawn error:", err.message);
      this.child = null;
      this.startTime = null;
      this.setState({
        status: "failed",
        pid: null,
        uptimeMs: null,
        lastExitCode: null,
      });
    });

    // Wait 5 seconds before health check
    await new Promise((r) => setTimeout(r, 5000));

    const healthy = await this.isHealthy();
    if (!healthy) {
      this.setState({ status: "failed" });
      throw new Error("opencode serve is not responding after 5s");
    }

    this.setState({ status: "running", uptimeMs: this.getUptimeMs() });
    console.log("[ProcessManager] ready at", this.options.serverUrl);
  }

  async stop(): Promise<void> {
    this.stopping = true;
    console.log("[ProcessManager] stopping...");

    if (!this.child || this.child.killed) {
      this.setState({ status: "stopped", pid: null, uptimeMs: null });
      this.stopping = false;
      return;
    }

    const pid = this.child.pid;
    this.child.kill("SIGTERM");

    const timeout = this.options.gracefulShutdownTimeoutMs ?? 5000;
    const deadline = Date.now() + timeout;

    // Poll until process exits or timeout
    while (Date.now() < deadline) {
      if (!this.child || this.child.killed) {
        this.setState({ status: "stopped", pid: null, uptimeMs: null });
        this.stopping = false;
        return;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    // If still alive after SIGTERM, escalate
    if (this.child && !this.child.killed) {
      if (process.platform === "win32" && pid) {
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`[ProcessManager] force-killed process ${pid} with taskkill`);
        } catch (err) {
          console.error(`[ProcessManager] taskkill failed for PID ${pid}:`, err);
          // Fallback to SIGKILL
          this.child.kill("SIGKILL");
        }
      } else {
        this.child.kill("SIGKILL");
      }
    }

    // Give a brief moment for SIGKILL/taskkill to take effect
    await new Promise((r) => setTimeout(r, 500));

    this.child = null;
    this.startTime = null;
    this.setState({ status: "stopped", pid: null, uptimeMs: null });
    this.stopping = false;
  }

  async restart(): Promise<void> {
    const now = Date.now();
    const windowMs = 60_000;
    this.restartTimestamps = this.restartTimestamps.filter((t) => now - t < windowMs);
    const maxRestarts = this.options.maxRestartsPerMinute ?? 3;
    if (this.restartTimestamps.length >= maxRestarts) {
      this.setState({ status: "failed" });
      throw new Error(
        `Too many restarts (${this.restartTimestamps.length} in the last minute). ` +
          `Wait a minute or check the server configuration.`
      );
    }
    this.restartTimestamps.push(now);
    this.setState({ status: "restarting" });
    await this.stop();
    await this.start();
  }

  async isHealthy(): Promise<boolean> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.options.serverUrl}/global/health`, {
        signal: AbortSignal.timeout(5000),
        headers: this.healthHeaders(),
      });
      if (!res.ok && res.status !== 401) {
        console.warn(`[ProcessManager] health check returned ${res.status}`);
      }
      const healthy = res.ok;
      const snapshot: HealthSnapshot = {
        healthy,
        timestamp: new Date(),
        latencyMs: Date.now() - start,
      };
      this.healthHistory.push(snapshot);
      if (this.healthHistory.length > 100) {
        this.healthHistory.shift();
      }
      this.setState({
        lastHealthCheck: snapshot.timestamp,
        consecutiveFailures: healthy ? 0 : this.state.consecutiveFailures + 1,
        uptimeMs: this.getUptimeMs(),
      });
      return healthy;
    } catch {
      const snapshot: HealthSnapshot = {
        healthy: false,
        timestamp: new Date(),
        latencyMs: Date.now() - start,
      };
      this.healthHistory.push(snapshot);
      if (this.healthHistory.length > 100) {
        this.healthHistory.shift();
      }
      this.setState({
        lastHealthCheck: snapshot.timestamp,
        consecutiveFailures: this.state.consecutiveFailures + 1,
        uptimeMs: this.getUptimeMs(),
      });
      return false;
    }
  }

  getState(): ProcessState {
    return {
      ...this.state,
      uptimeMs: this.getUptimeMs(),
    };
  }

  getHealthHistory(limit?: number): HealthSnapshot[] {
    const arr = this.healthHistory.slice();
    if (limit !== undefined && limit >= 0) {
      return arr.slice(-limit);
    }
    return arr;
  }

  onStateChange(callback: (state: ProcessState) => void): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      const idx = this.stateCallbacks.indexOf(callback);
      if (idx !== -1) {
        this.stateCallbacks.splice(idx, 1);
      }
    };
  }

  private async killExisting(): Promise<void> {
    if (this.child && !this.child.killed) {
      console.log("[ProcessManager] killing existing process...");
      const pid = this.child.pid;
      this.child.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 5000));
      if (this.child && !this.child.killed) {
        if (process.platform === "win32" && pid) {
          try {
            await execAsync(`taskkill /PID ${pid} /F`);
          } catch {
            this.child.kill("SIGKILL");
          }
        } else {
          this.child.kill("SIGKILL");
        }
      }
      this.child = null;
      this.startTime = null;
    }
  }
}
