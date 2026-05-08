import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProcessManager } from "./ProcessManager.js";

const TEST_URL = "http://127.0.0.1:4096";

describe("ProcessManager", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  it("onStateChange fires on state change", () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });
    const cb = vi.fn();
    const unsub = pm.onStateChange(cb);
    pm.restart();
    // restart is async and may throw due to circuit breaker, but state change fires
    expect(cb).toHaveBeenCalled();
    unsub();
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

  it("getHealthHistory returns snapshots", async () => {
    const pm = new ProcessManager({
      serverUrl: TEST_URL,
      projectDir: ".",
      serverPort: 4096,
      serverHost: "127.0.0.1",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 }))
    );

    await pm.isHealthy();
    const history = pm.getHealthHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty("healthy");
    expect(history[0]).toHaveProperty("timestamp");
    expect(history[0]).toHaveProperty("latencyMs");
  });
});
