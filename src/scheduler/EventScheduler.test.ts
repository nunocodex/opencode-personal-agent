import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventScheduler } from "./EventScheduler.js";
import { unlinkSync, existsSync, writeFileSync } from "fs";

const TEST_PATH = "./data/test-scheduler-events.json";

describe("EventScheduler", () => {
  let executeMock: ReturnType<typeof vi.fn>;
  let scheduler: EventScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    if (existsSync(TEST_PATH)) {
      unlinkSync(TEST_PATH);
    }
    executeMock = vi.fn().mockResolvedValue(undefined);
    scheduler = new EventScheduler({
      checkIntervalMs: 60_000,
      eventsFilePath: TEST_PATH,
      onExecute: executeMock as (event: import("./types.js").ScheduledEvent) => Promise<void>,
    });
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
    if (existsSync(TEST_PATH)) {
      unlinkSync(TEST_PATH);
    }
  });

  it("starts empty when no file exists", () => {
    scheduler.start();
    expect(scheduler.list()).toEqual([]);
  });

  it("schedules an event and persists it", () => {
    scheduler.start();
    const dueAt = new Date(Date.now() + 5 * 60 * 1000);
    const id = scheduler.schedule("123", dueAt, "reminder");
    expect(id).toBeDefined();
    expect(scheduler.list("123")).toHaveLength(1);
  });

  it("executes due events on check", async () => {
    scheduler.start();
    const dueAt = new Date(Date.now() + 5 * 60 * 1000);
    scheduler.schedule("123", dueAt, "reminder");

    vi.advanceTimersByTime(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(1);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const event = executeMock.mock.calls[0][0];
    expect(event.chatId).toBe("123");
    expect(event.what).toBe("reminder");
  });

  it("does not execute events before due", async () => {
    scheduler.start();
    const dueAt = new Date(Date.now() + 10 * 60 * 1000);
    scheduler.schedule("123", dueAt, "reminder");

    vi.advanceTimersByTime(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(1);

    expect(executeMock).not.toHaveBeenCalled();
  });

  it("skips missed events on start", () => {
    const data = {
      events: [
        {
          id: "old-1",
          chatId: "123",
          what: "missed",
          dueAt: new Date(Date.now() - 1000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
    };
    writeFileSync(TEST_PATH, JSON.stringify(data));

    scheduler.start();
    expect(scheduler.list("123")).toHaveLength(0);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("cancels an event by matching what", () => {
    scheduler.start();
    const dueAt = new Date(Date.now() + 5 * 60 * 1000);
    scheduler.schedule("123", dueAt, "reminder");

    const result = scheduler.cancel("123", "reminder");
    expect(result).toBe(true);
    expect(scheduler.list("123")).toHaveLength(0);
  });

  it("cancel returns false when no match", () => {
    scheduler.start();
    const dueAt = new Date(Date.now() + 5 * 60 * 1000);
    scheduler.schedule("123", dueAt, "reminder");

    const result = scheduler.cancel("123", "nonexistent");
    expect(result).toBe(false);
    expect(scheduler.list("123")).toHaveLength(1);
  });

  it("only cancels events for matching chatId", () => {
    scheduler.start();
    const dueAt = new Date(Date.now() + 5 * 60 * 1000);
    scheduler.schedule("123", dueAt, "reminder");

    const result = scheduler.cancel("456", "reminder");
    expect(result).toBe(false);
  });

  it("removes executed events from list", async () => {
    scheduler.start();
    const dueAt = new Date(Date.now() + 5 * 60 * 1000);
    scheduler.schedule("123", dueAt, "reminder");

    vi.advanceTimersByTime(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(1);

    expect(scheduler.list("123")).toHaveLength(0);
  });

  it("stops cleanly", () => {
    scheduler.start();
    scheduler.stop();
    expect(scheduler.list()).toEqual([]);
  });

  it("sorts events by due date", () => {
    scheduler.start();
    const dueAt1 = new Date(Date.now() + 10 * 60 * 1000);
    const dueAt2 = new Date(Date.now() + 5 * 60 * 1000);
    scheduler.schedule("123", dueAt1, "later");
    scheduler.schedule("123", dueAt2, "sooner");

    const list = scheduler.list("123");
    expect(list[0].what).toBe("sooner");
    expect(list[1].what).toBe("later");
  });

  it("handles execution errors gracefully", async () => {
    executeMock.mockRejectedValue(new Error("send failed"));
    scheduler.start();
    const dueAt = new Date(Date.now() + 5 * 60 * 1000);
    scheduler.schedule("123", dueAt, "reminder");

    vi.advanceTimersByTime(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(1);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(scheduler.list("123")).toHaveLength(0);
  });
});
