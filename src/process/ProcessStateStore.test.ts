import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync, existsSync } from "fs";
import { ProcessStateStore } from "./ProcessStateStore.js";

const TEST_PATH = "./data/test-process-state.json";

describe("ProcessStateStore", () => {
  beforeEach(() => {
    if (existsSync(TEST_PATH)) {
      unlinkSync(TEST_PATH);
    }
  });

  afterEach(() => {
    if (existsSync(TEST_PATH)) {
      unlinkSync(TEST_PATH);
    }
  });

  it("initializes with default state when file does not exist", () => {
    const store = new ProcessStateStore(TEST_PATH);
    const state = store.getState();
    expect(state.status).toBe("stopped");
    expect(state.pid).toBeNull();
    expect(state.startCount).toBe(0);
    expect(state.consecutiveFailures).toBe(0);
  });

  it("persists and reloads state", () => {
    const store1 = new ProcessStateStore(TEST_PATH);
    store1.save({
      status: "running",
      pid: 12345,
      uptimeMs: 5000,
      lastHealthCheck: new Date("2026-01-01T00:00:00.000Z"),
      consecutiveFailures: 2,
      startCount: 3,
      lastExitCode: 1,
    });

    const store2 = new ProcessStateStore(TEST_PATH);
    const state = store2.getState();
    expect(state.status).toBe("running");
    expect(state.pid).toBe(12345);
    expect(state.uptimeMs).toBe(5000);
    expect(state.lastHealthCheck).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(state.consecutiveFailures).toBe(2);
    expect(state.startCount).toBe(3);
    expect(state.lastExitCode).toBe(1);
  });

  it("returns immutable copy from getState", () => {
    const store = new ProcessStateStore(TEST_PATH);
    const state = store.getState();
    state.status = "running";
    const state2 = store.getState();
    expect(state2.status).toBe("stopped");
  });

  it("handles corrupt file gracefully", () => {
    const fs = require("fs");
    fs.writeFileSync(TEST_PATH, "not json");
    const store = new ProcessStateStore(TEST_PATH);
    expect(store.getState().status).toBe("stopped");
  });
});
