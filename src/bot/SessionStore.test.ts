import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SessionStore } from "./SessionStore.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe("SessionStore", () => {
  const TEST_PATH = "/tmp/test-sessions.json";

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("SESSION_STORE_PATH", "");
    vi.mocked(existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("constructs with custom path", () => {
    const store = new SessionStore(TEST_PATH);
    expect(store.get("123")).toBeUndefined();
  });

  it("constructs with default path from env", () => {
    vi.stubEnv("SESSION_STORE_PATH", "/env/sessions.json");
    vi.mocked(existsSync).mockImplementation((p) => p === "/env/sessions.json");
    const store = new SessionStore();
    expect(store.get("123")).toBeUndefined();
  });

  it("constructs with fallback default path", () => {
    vi.stubEnv("SESSION_STORE_PATH", "");
    const store = new SessionStore();
    expect(store.get("123")).toBeUndefined();
  });

  it("get returns session after set", () => {
    const store = new SessionStore(TEST_PATH);
    store.set("chat1", "sess1");
    const entry = store.get("chat1");
    expect(entry).toBeDefined();
    expect(entry?.sessionId).toBe("sess1");
  });

  it("delete removes session", () => {
    const store = new SessionStore(TEST_PATH);
    store.set("chat1", "sess1");
    store.delete("chat1");
    expect(store.get("chat1")).toBeUndefined();
  });

  it("set updates createdAt and updatedAt correctly", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(now);
    const store = new SessionStore(TEST_PATH);
    store.set("chat1", "sess1");
    const first = store.get("chat1")!;
    expect(first.createdAt).toBe(first.updatedAt);

    // Advance time
    vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
    store.set("chat1", "sess2");
    const second = store.get("chat1")!;
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).not.toBe(first.updatedAt);
    vi.useRealTimers();
  });

  it("save persists to JSON file atomically", () => {
    const store = new SessionStore(TEST_PATH);
    store.set("chat1", "sess1");

    expect(writeFileSync).toHaveBeenCalled();
    const [path, content] = vi.mocked(writeFileSync).mock.calls.at(-1)!;
    expect(path).toContain("test-sessions.json");
    const parsed = JSON.parse(content as string);
    expect(parsed["chat1"].sessionId).toBe("sess1");
  });

  it("load reloads from JSON file on construction", () => {
    const data = {
      chat1: { sessionId: "sess1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    };
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(data));

    const store = new SessionStore(TEST_PATH);
    expect(store.get("chat1")?.sessionId).toBe("sess1");
  });

  it("handles missing file gracefully (starts empty)", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const store = new SessionStore(TEST_PATH);
    expect(store.list()).toEqual([]);
  });

  it("handles corrupt JSON gracefully", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("not json");
    const store = new SessionStore(TEST_PATH);
    expect(store.list()).toEqual([]);
  });

  it("list returns all sessions", () => {
    const store = new SessionStore(TEST_PATH);
    store.set("chat1", "sess1");
    store.set("chat2", "sess2");
    const list = store.list();
    expect(list.length).toBe(2);
    expect(list.map((l) => l.chatId).sort()).toEqual(["chat1", "chat2"]);
  });

  it("creates directory if missing on save", () => {
    const store = new SessionStore("/tmp/nested/dir/sessions.json");
    store.set("chat1", "sess1");
    expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining("nested"), { recursive: true });
  });
});
