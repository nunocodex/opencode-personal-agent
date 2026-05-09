import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync, existsSync, writeFileSync } from "fs";
import { EventStore } from "./EventStore.js";

const TEST_PATH = "./data/test-events.json";

describe("EventStore", () => {
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

  it("initializes with empty events when file does not exist", () => {
    const store = new EventStore(TEST_PATH);
    expect(store.load()).toEqual([]);
  });

  it("persists and reloads events", () => {
    const store = new EventStore(TEST_PATH);
    const events = [
      {
        id: "evt-1",
        chatId: "123",
        what: "reminder",
        dueAt: new Date("2026-01-01T00:00:00.000Z"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];
    store.save(events);
    const loaded = new EventStore(TEST_PATH).load();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("evt-1");
    expect(loaded[0].chatId).toBe("123");
    expect(loaded[0].what).toBe("reminder");
    expect(loaded[0].dueAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(loaded[0].createdAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("handles corrupt file gracefully", () => {
    writeFileSync(TEST_PATH, "not json");
    const store = new EventStore(TEST_PATH);
    expect(store.load()).toEqual([]);
  });

  it("handles missing events array gracefully", () => {
    writeFileSync(TEST_PATH, JSON.stringify({}));
    const store = new EventStore(TEST_PATH);
    expect(store.load()).toEqual([]);
  });
});
