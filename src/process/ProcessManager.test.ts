import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { EventEmitter } from "events";
import { ProcessManager } from "./ProcessManager.js";
import { spawn, exec } from "child_process";
import { createConnection } from "net";

const TEST_URL = "http://127.0.0.1:4096";

// Module-level mutable state to control mocks from tests
let nextSpawnChild: any = null;
let execResults: Map<string, { stdout: string; stderr: string } | Error> = new Map();

function clearExecResults() {
  execResults = new Map();
}

function setExecResult(cmd: string, result: { stdout: string; stderr: string } | Error) {
  execResults.set(cmd, result);
}

// Mock util.promisify so that promisify(exec) resolves to { stdout, stderr }
vi.mock("util", async (importOriginal) => {
  const actual = await importOriginal() as typeof import("util");
  return {
    ...actual,
    promisify: vi.fn((fn: any) => {
      return (...args: any[]) => {
        return new Promise((resolve, reject) => {
          const callback = (err: any, stdout: string, stderr: string) => {
            if (err) reject(err);
            else resolve({ stdout, stderr });
          };
          fn(...args, callback);
        });
      };
    }),
  };
});

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal() as typeof import("child_process");
  return {
    ...actual,
    spawn: vi.fn(() => nextSpawnChild),
    exec: vi.fn(),
  };
});

vi.mock("net", async (importOriginal) => {
  const actual = await importOriginal() as typeof import("net");
  return {
    ...actual,
    createConnection: vi.fn(),
  };
});

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal() as typeof import("fs");
  return {
    ...actual,
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

function setupExecMock() {
  vi.mocked(exec).mockImplementation((cmd: string, optionsOrCb: any, cb?: any) => {
    let callback = cb;
    if (typeof optionsOrCb === "function") {
      callback = optionsOrCb;
    }
    const cp = Object.assign(new EventEmitter(), {
      pid: 999,
      kill: vi.fn(),
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
    });

    const command = String(cmd);
    const result = execResults.get(command) ?? { stdout: "", stderr: "" };

    if (result instanceof Error) {
      callback?.(result, "", "");
    } else {
      callback?.(null, result.stdout, result.stderr);
    }

    return cp as any;
  });
}

function createMockSocket() {
  const socket = new EventEmitter() as any;
  socket.destroy = vi.fn();
  socket.setTimeout = vi.fn((ms: number, cb?: () => void) => {
    if (cb) socket.once("timeout", cb);
    return socket;
  });
  return socket;
}

function setupNetMock(portInUse: boolean, viaTimeout = false) {
  vi.mocked(createConnection).mockImplementation(() => {
    const socket = createMockSocket();
    Promise.resolve().then(() => {
      if (viaTimeout) {
        socket.emit("timeout");
      } else if (portInUse) {
        socket.emit("connect");
      } else {
        socket.emit("error", new Error("ECONNREFUSED"));
      }
    });
    return socket;
  });
}

function createMockChildProcess(pid = 12345, immediateKill = true) {
  const child = Object.assign(new EventEmitter(), {
    pid,
    killed: false,
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    kill: vi.fn((signal?: NodeJS.Signals | number) => {
      if (immediateKill) {
        child.killed = true;
      }
      return true;
    }),
  });
  return child;
}

describe("ProcessManager", () => {
  let originalPlatform: PropertyDescriptor | undefined;

  beforeAll(() => {
    originalPlatform = Object.getOwnPropertyDescriptor(process, "platform");
  });

  beforeEach(() => {
    nextSpawnChild = null;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(process, "kill").mockImplementation(() => true as any);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );
    clearExecResults();
    setupExecMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearExecResults();
    nextSpawnChild = null;
    if (originalPlatform) {
      Object.defineProperty(process, "platform", originalPlatform);
    }
  });

  it("constructs with defaults", () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });
    const state = pm.getState();
    expect(state.status).toBe("stopped");
    expect(state.consecutiveFailures).toBe(0);
    expect(state.uptimeMs).toBeNull();
  });

  it("healthHeaders returns empty when no password", () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });
    // @ts-expect-error accessing private method for test
    const headers = pm.healthHeaders();
    expect(headers).toEqual({});
  });

  it("healthHeaders returns Basic Auth when password set", () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
      serverUsername: "admin",
      serverPassword: "secret",
    });
    // @ts-expect-error accessing private method for test
    const headers = pm.healthHeaders();
    expect(headers["Authorization"]).toMatch(/^Basic /);
  });

  it("onStateChange fires on state change", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });
    const cb = vi.fn();
    const unsub = pm.onStateChange(cb);
    vi.spyOn(pm, "stop").mockResolvedValue(undefined);
    vi.spyOn(pm, "start").mockResolvedValue(undefined);
    await pm.restart();
    expect(cb).toHaveBeenCalled();
    unsub();
  });

  it("onStateChange handles callback errors gracefully", () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });
    const cb = vi.fn(() => {
      throw new Error("callback error");
    });
    pm.onStateChange(cb);
    // @ts-expect-error accessing private method for test
    pm.setState({ status: "starting" });
    expect(cb).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "[ProcessManager] state change callback error:",
      expect.any(Error)
    );
  });

  it("onStateChange unsubscribe works", () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });
    const cb = vi.fn();
    const unsub = pm.onStateChange(cb);
    unsub();
    // @ts-expect-error accessing private method for test
    pm.setState({ status: "starting" });
    expect(cb).not.toHaveBeenCalled();
  });

  it("setState does not fire callbacks when state unchanged", () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });
    const cb = vi.fn();
    pm.onStateChange(cb);
    // @ts-expect-error
    pm.setState({ status: "stopped" }); // same as current
    expect(cb).not.toHaveBeenCalled();
  });

  it("circuit breaker blocks excessive restarts", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
      maxRestartsPerMinute: 2,
    });

    vi.spyOn(pm, "stop").mockResolvedValue(undefined);
    vi.spyOn(pm, "start").mockResolvedValue(undefined);

    await pm.restart();
    await pm.restart();
    // 3rd restart should be blocked by circuit breaker
    await expect(pm.restart()).rejects.toThrow(/Too many restarts/);
  });

  it("restart() success path", async () => {
    setupNetMock(false);
    const child1 = createMockChildProcess(12345);
    nextSpawnChild = child1;

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const startPromise = pm.start();
    await vi.advanceTimersByTimeAsync(5000);
    await startPromise;
    expect(pm.getState().status).toBe("running");

    const child2 = createMockChildProcess(12346);
    nextSpawnChild = child2;

    const restartPromise = pm.restart();
    await vi.advanceTimersByTimeAsync(5000);
    await restartPromise;

    expect(pm.getState().status).toBe("running");
  });

  it("getHealthHistory returns snapshots", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    await pm.isHealthy();
    const history = pm.getHealthHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty("healthy");
    expect(history[0]).toHaveProperty("timestamp");
    expect(history[0]).toHaveProperty("latencyMs");
  });

  it("getHealthHistory respects limit", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    await pm.isHealthy();
    await pm.isHealthy();
    await pm.isHealthy();

    const limited = pm.getHealthHistory(2);
    expect(limited.length).toBe(2);
  });

  it("getHealthHistory ignores negative limit", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    await pm.isHealthy();
    const history = pm.getHealthHistory(-1);
    expect(history.length).toBe(1);
  });

  it("healthHistory trims to 100 entries on success", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    for (let i = 0; i < 101; i++) {
      await pm.isHealthy();
    }

    expect(pm.getHealthHistory().length).toBe(100);
  });

  it("healthHistory trims to 100 entries on failure", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network error");
    }));

    for (let i = 0; i < 101; i++) {
      await pm.isHealthy();
    }

    expect(pm.getHealthHistory().length).toBe(100);
  });

  it("getState returns current uptime", () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });
    // @ts-expect-error
    pm.startTime = Date.now() - 1000;
    expect(pm.getState().uptimeMs).toBeGreaterThanOrEqual(1000);
  });

  async function waitForMicrotasks(count = 5) {
    for (let i = 0; i < count; i++) {
      await Promise.resolve();
    }
  }

  it("start() success path", async () => {
    setupNetMock(false);
    const child = createMockChildProcess();
    nextSpawnChild = child;

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const startPromise = pm.start();
    await waitForMicrotasks();

    const runningChild = (pm as any).child;
    expect(runningChild).not.toBeNull();
    runningChild.stdout.emit("data", Buffer.from("server started\n"));
    runningChild.stderr.emit("data", Buffer.from("warning\n"));

    await vi.advanceTimersByTimeAsync(5000);
    await startPromise;

    expect(pm.getState().status).toBe("running");
    expect(pm.getState().pid).toBe(12345);
    expect(vi.mocked(spawn)).toHaveBeenCalledWith(
      expect.stringContaining("opencode.cmd"),
      expect.objectContaining({ shell: true })
    );
    expect(console.log).toHaveBeenCalledWith("[opencode-serve]", "server started");
    expect(console.error).toHaveBeenCalledWith("[opencode-serve]", "warning");
  });

  it("start() idempotency when already running and healthy", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const child = createMockChildProcess();
    // @ts-expect-error
    pm.child = child;
    // @ts-expect-error
    pm.state.status = "running";

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    await pm.start();

    expect(console.log).toHaveBeenCalledWith("[ProcessManager] already running and healthy");
    expect(pm.getState().status).toBe("running");
  });

  it("start() restarts when existing child is unhealthy", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const oldChild = createMockChildProcess(11111, false);
    // @ts-expect-error
    pm.child = oldChild;
    // @ts-expect-error
    pm.state.status = "running";

    // First isHealthy call (idempotency) returns false, second (after spawn) returns true
    let fetchCallCount = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      fetchCallCount++;
      if (fetchCallCount === 1) return new Response(null, { status: 500 });
      return new Response(null, { status: 200 });
    }));

    setupNetMock(false);
    const newChild = createMockChildProcess(22222);
    nextSpawnChild = newChild;

    setExecResult("taskkill /PID 11111 /F", { stdout: "", stderr: "" });

    const startPromise = pm.start();
    await vi.advanceTimersByTimeAsync(5000); // killExisting wait
    await vi.advanceTimersByTimeAsync(5000); // start() health wait
    await startPromise;

    expect(pm.getState().status).toBe("running");
    expect(pm.getState().pid).toBe(22222);
    expect(oldChild.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("start() with port conflict cleans up stray process", async () => {
    setupNetMock(true);
    const child = createMockChildProcess();
    nextSpawnChild = child;

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    setExecResult("netstat -ano | findstr :4096", {
      stdout: "  TCP    127.0.0.1:4096    0.0.0.0:0    LISTENING    9876",
      stderr: "",
    });
    setExecResult("taskkill /PID 9876 /F", { stdout: "", stderr: "" });

    const startPromise = pm.start();
    await vi.advanceTimersByTimeAsync(7000);
    await startPromise;

    expect(pm.getState().status).toBe("running");
    expect(vi.mocked(exec)).toHaveBeenCalledWith(
      expect.stringContaining("taskkill"),
      expect.anything()
    );
  });

  it("start() kills linux process on port conflict", async () => {
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });

    setupNetMock(true);
    const child = createMockChildProcess();
    nextSpawnChild = child;

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    setExecResult("lsof -t -i:4096", { stdout: "1234\n5678", stderr: "" });

    const startPromise = pm.start();
    await vi.advanceTimersByTimeAsync(7000);
    await startPromise;

    expect(pm.getState().status).toBe("running");
    expect(process.kill).toHaveBeenCalledWith(1234, "SIGKILL");
    expect(process.kill).toHaveBeenCalledWith(5678, "SIGKILL");
  });

  it("start() handles port check timeout", async () => {
    setupNetMock(false, true);
    const child = createMockChildProcess();
    nextSpawnChild = child;

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const startPromise = pm.start();
    await vi.advanceTimersByTimeAsync(5000);
    await startPromise;

    expect(pm.getState().status).toBe("running");
  });

  it("start() uses linux spawn path", async () => {
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });

    setupNetMock(false);
    const child = createMockChildProcess();
    nextSpawnChild = child;

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const startPromise = pm.start();
    await vi.advanceTimersByTimeAsync(5000);
    await startPromise;

    expect(vi.mocked(spawn)).toHaveBeenCalledWith(
      "opencode",
      ["serve", "--port", "4096", "--hostname", "127.0.0.1"],
      expect.objectContaining({ shell: false })
    );
  });

  it("start() with spawn error sets state to failed", async () => {
    setupNetMock(false);
    const child = createMockChildProcess();
    nextSpawnChild = child;

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("fetch failed");
    }));

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const startPromise = pm.start().catch((e) => e);
    await waitForMicrotasks();

    const runningChild = (pm as any).child;
    expect(runningChild).not.toBeNull();
    runningChild.emit("error", new Error("spawn failed"));

    await vi.advanceTimersByTimeAsync(5000);

    const result = await startPromise;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe("opencode serve is not responding after 5s");
    expect(pm.getState().status).toBe("failed");
  });

  it("start() with process exit during startup", async () => {
    setupNetMock(false);
    const child = createMockChildProcess();
    nextSpawnChild = child;

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("fetch failed");
    }));

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const startPromise = pm.start().catch((e) => e);
    await waitForMicrotasks();

    const runningChild = (pm as any).child;
    expect(runningChild).not.toBeNull();
    runningChild.emit("close", 1);

    await vi.advanceTimersByTimeAsync(5000);

    const result = await startPromise;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe("opencode serve is not responding after 5s");
    expect(pm.getState().status).toBe("failed");
  });

  it("start() with health check failure after 5s", async () => {
    setupNetMock(false);
    const child = createMockChildProcess();
    nextSpawnChild = child;

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const startPromise = pm.start().catch((e) => e);
    await vi.advanceTimersByTimeAsync(5000);

    const result = await startPromise;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe("opencode serve is not responding after 5s");
    expect(pm.getState().status).toBe("failed");
  });

  it("start() while stopping throws", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    // @ts-expect-error
    pm.stopping = true;

    await expect(pm.start()).rejects.toThrow("Cannot start while stopping");
  });

  it("stop() graceful shutdown", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const child = createMockChildProcess(12345, true);
    // @ts-expect-error
    pm.child = child;
    // @ts-expect-error
    pm.state.status = "running";
    // @ts-expect-error
    pm.startTime = Date.now();

    await pm.stop();

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(pm.getState().status).toBe("stopped");
    expect(pm.getState().pid).toBeNull();
  });

  it("stop() idempotency when no child", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    await pm.stop();
    expect(pm.getState().status).toBe("stopped");
  });

  it("stop() escalates to taskkill on windows", async () => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const child = createMockChildProcess(12345, false);
    // @ts-expect-error
    pm.child = child;
    // @ts-expect-error
    pm.state.status = "running";
    // @ts-expect-error
    pm.startTime = Date.now();

    setExecResult("taskkill /PID 12345 /F", { stdout: "", stderr: "" });

    const stopPromise = pm.stop();

    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTicks();

    await vi.advanceTimersByTimeAsync(500);
    await stopPromise;

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(pm.getState().status).toBe("stopped");
  });

  it("stop() falls back to SIGKILL when taskkill fails", async () => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const child = createMockChildProcess(12345, false);
    // @ts-expect-error
    pm.child = child;
    // @ts-expect-error
    pm.state.status = "running";

    setExecResult("taskkill /PID 12345 /F", new Error("taskkill failed"));

    const stopPromise = pm.stop();

    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTicks();

    await vi.advanceTimersByTimeAsync(500);
    await stopPromise;

    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
    expect(pm.getState().status).toBe("stopped");
  });

  it("stop() uses SIGKILL on linux", async () => {
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const child = createMockChildProcess(12345, false);
    // @ts-expect-error
    pm.child = child;
    // @ts-expect-error
    pm.state.status = "running";

    const stopPromise = pm.stop();

    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(500);
    await stopPromise;

    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
    expect(pm.getState().status).toBe("stopped");
  });

  it("isHealthy() handles 401 without warning", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));

    const healthy = await pm.isHealthy();

    expect(healthy).toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
    expect(pm.getState().consecutiveFailures).toBe(1);
  });

  it("isHealthy() warns on non-401 non-ok response", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    const healthy = await pm.isHealthy();

    expect(healthy).toBe(false);
    expect(console.warn).toHaveBeenCalledWith("[ProcessManager] health check returned 500");
    expect(pm.getState().consecutiveFailures).toBe(1);
  });

  it("isHealthy() handles network error", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network error");
    }));

    const healthy = await pm.isHealthy();

    expect(healthy).toBe(false);
    expect(pm.getState().consecutiveFailures).toBe(1);
  });

  it("isHealthy() resets consecutiveFailures on success", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    await pm.isHealthy();
    expect(pm.getState().consecutiveFailures).toBe(1);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    await pm.isHealthy();
    expect(pm.getState().consecutiveFailures).toBe(0);
  });

  it("killExisting() cleans up zombie process on windows", async () => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const child = createMockChildProcess(12345, false);
    // @ts-expect-error
    pm.child = child;

    setExecResult("taskkill /PID 12345 /F", { stdout: "", stderr: "" });

    const promise = (pm as any).killExisting();

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");

    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTicks();

    await promise;

    expect(pm.getState().pid).toBeNull();
    // @ts-expect-error
    expect(pm.child).toBeNull();
  });

  it("killExisting() falls back to SIGKILL when taskkill fails on windows", async () => {
    Object.defineProperty(process, "platform", { value: "win32", configurable: true });

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const child = createMockChildProcess(12345, false);
    // @ts-expect-error
    pm.child = child;

    setExecResult("taskkill /PID 12345 /F", new Error("taskkill failed"));

    const promise = (pm as any).killExisting();

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");

    await vi.advanceTimersByTimeAsync(5000);
    await vi.runAllTicks();

    await promise;

    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
    // @ts-expect-error
    expect(pm.child).toBeNull();
  });

  it("killExisting() uses SIGKILL on linux", async () => {
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });

    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    const child = createMockChildProcess(12345, false);
    // @ts-expect-error
    pm.child = child;

    const promise = (pm as any).killExisting();

    expect(child.kill).toHaveBeenCalledWith("SIGTERM");

    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
    // @ts-expect-error
    expect(pm.child).toBeNull();
  });
});
