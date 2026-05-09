import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
}));

vi.mock("child_process", () => ({
  spawn: mockSpawn,
}));

import { spawnAsync, killAllSpawnedProcesses, getActiveProcessCount } from "./spawnAsync.js";

function createMockChildProcess(overrides?: Partial<any>) {
  const stdout = {
    on: vi.fn(),
  };
  const stderr = {
    on: vi.fn(),
  };
  const child = {
    stdout,
    stderr,
    kill: vi.fn(),
    killed: false,
    on: vi.fn(),
    ...overrides,
  };
  return { child, stdout, stderr };
}

describe("spawnAsync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockSpawn.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    killAllSpawnedProcesses();
  });

  it("resolves with stdout and exit code 0", async () => {
    const { child, stdout, stderr } = createMockChildProcess();
    mockSpawn.mockReturnValue(child);

    const promise = spawnAsync("echo", ["hello"]);

    const closeHandler = child.on.mock.calls.find((call: any[]) => call[0] === "close")?.[1];
    const stdoutHandler = stdout.on.mock.calls.find((call: any[]) => call[0] === "data")?.[1];

    expect(closeHandler).toBeDefined();
    expect(stdoutHandler).toBeDefined();

    stdoutHandler(Buffer.from("hello world"));
    closeHandler(0);

    const result = await promise;
    expect(result.stdout).toBe("hello world");
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("rejects on spawn error", async () => {
    const { child, stdout, stderr } = createMockChildProcess();
    mockSpawn.mockReturnValue(child);

    const promise = spawnAsync("badcmd", []);

    const errorHandler = child.on.mock.calls.find((call: any[]) => call[0] === "error")?.[1];
    errorHandler(new Error("spawn failed"));

    await expect(promise).rejects.toThrow("spawn failed");
  });

  it("rejects on timeout and kills process", async () => {
    const { child, stdout, stderr } = createMockChildProcess();
    mockSpawn.mockReturnValue(child);

    const promise = spawnAsync("sleep", ["10"], { timeoutMs: 1000 });

    vi.advanceTimersByTime(1001);

    await expect(promise).rejects.toThrow("spawnAsync timeout after 1000ms");
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");

    vi.advanceTimersByTime(5001);
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("does not reject if process closes before timeout", async () => {
    const { child, stdout } = createMockChildProcess();
    mockSpawn.mockReturnValue(child);

    const promise = spawnAsync("echo", ["hi"], { timeoutMs: 5000 });

    const closeHandler = child.on.mock.calls.find((call: any[]) => call[0] === "close")?.[1];
    closeHandler(0);

    vi.advanceTimersByTime(6000);

    const result = await promise;
    expect(result.exitCode).toBe(0);
  });

  it("captures stderr separately", async () => {
    const { child, stdout, stderr } = createMockChildProcess();
    mockSpawn.mockReturnValue(child);

    const promise = spawnAsync("cmd", []);

    const stdoutHandler = stdout.on.mock.calls.find((call: any[]) => call[0] === "data")?.[1];
    const stderrHandler = stderr.on.mock.calls.find((call: any[]) => call[0] === "data")?.[1];
    const closeHandler = child.on.mock.calls.find((call: any[]) => call[0] === "close")?.[1];

    stdoutHandler(Buffer.from("out"));
    stderrHandler(Buffer.from("err"));
    closeHandler(1);

    const result = await promise;
    expect(result.stdout).toBe("out");
    expect(result.stderr).toBe("err");
    expect(result.exitCode).toBe(1);
  });

  it("killAllSpawnedProcesses kills all tracked processes", async () => {
    const { child: child1 } = createMockChildProcess();
    const { child: child2 } = createMockChildProcess();
    mockSpawn.mockReturnValueOnce(child1).mockReturnValueOnce(child2);

    spawnAsync("cmd1", []);
    spawnAsync("cmd2", []);

    expect(getActiveProcessCount()).toBe(2);

    killAllSpawnedProcesses();

    expect(child1.kill).toHaveBeenCalledWith("SIGTERM");
    expect(child2.kill).toHaveBeenCalledWith("SIGTERM");

    vi.advanceTimersByTime(5001);
    expect(child1.kill).toHaveBeenCalledWith("SIGKILL");
    expect(child2.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it("tracks active processes correctly", async () => {
    const { child } = createMockChildProcess();
    mockSpawn.mockReturnValue(child);

    expect(getActiveProcessCount()).toBe(0);

    const promise = spawnAsync("echo", ["hi"]);
    expect(getActiveProcessCount()).toBe(1);

    const closeHandler = child.on.mock.calls.find((call: any[]) => call[0] === "close")?.[1];
    closeHandler(0);

    await promise;
    expect(getActiveProcessCount()).toBe(0);
  });
});
