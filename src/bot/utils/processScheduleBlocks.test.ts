import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { processScheduleBlocks } from "./processScheduleBlocks.js";
import { EventScheduler } from "../../scheduler/EventScheduler.js";
import { unlinkSync, existsSync } from "fs";

const TEST_PATH = "./data/test-process-schedule.json";

describe("processScheduleBlocks", () => {
  let scheduler: EventScheduler;

  beforeEach(() => {
    if (existsSync(TEST_PATH)) {
      unlinkSync(TEST_PATH);
    }
    scheduler = new EventScheduler({
      checkIntervalMs: 60_000,
      eventsFilePath: TEST_PATH,
      onExecute: vi.fn().mockResolvedValue(undefined),
    });
    scheduler.start();
  });

  afterEach(() => {
    scheduler.stop();
    if (existsSync(TEST_PATH)) {
      unlinkSync(TEST_PATH);
    }
  });

  it("returns clean text when no blocks", () => {
    const result = processScheduleBlocks("123", "Hello", scheduler);
    expect(result.cleanText).toBe("Hello");
    expect(result.scheduledCount).toBe(0);
    expect(result.cancelledCount).toBe(0);
  });

  it("schedules events from blocks", () => {
    const text = "[SCHEDULE]\nin 5 minutes\nRemind me\n[/SCHEDULE]";
    const result = processScheduleBlocks("123", text, scheduler);
    expect(result.cleanText).toBe("");
    expect(result.scheduledCount).toBe(1);
    expect(result.cancelledCount).toBe(0);
    expect(scheduler.list("123")).toHaveLength(1);
  });

  it("cancels events from blocks", () => {
    scheduler.schedule("123", new Date(Date.now() + 60000), "Remind me");
    const text = "[SCHEDULE_CANCEL]\nRemind me\n[/SCHEDULE_CANCEL]";
    const result = processScheduleBlocks("123", text, scheduler);
    expect(result.cancelledCount).toBe(1);
    expect(scheduler.list("123")).toHaveLength(0);
  });

  it("reports parse errors for invalid times", () => {
    const text = "[SCHEDULE]\nsometime\nRemind me\n[/SCHEDULE]";
    const result = processScheduleBlocks("123", text, scheduler);
    expect(result.scheduledCount).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("reports error for cancel when not found", () => {
    const text = "[SCHEDULE_CANCEL]\nNonexistent\n[/SCHEDULE_CANCEL]";
    const result = processScheduleBlocks("123", text, scheduler);
    expect(result.cancelledCount).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
