import { describe, it, expect } from "vitest";
import { parseScheduleBlocks } from "./parseScheduleBlocks.js";

describe("parseScheduleBlocks", () => {
  it("returns original text when no blocks", () => {
    const result = parseScheduleBlocks("Hello world");
    expect(result.cleanText).toBe("Hello world");
    expect(result.schedules).toEqual([]);
    expect(result.cancels).toEqual([]);
  });

  it("parses a single schedule block", () => {
    const text = "Some text\n[SCHEDULE]\nin 5 minutes\nRemind me\n[/SCHEDULE]\nMore text";
    const result = parseScheduleBlocks(text);
    expect(result.cleanText).toBe("Some text\n\nMore text");
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].when).toBe("in 5 minutes");
    expect(result.schedules[0].what).toBe("Remind me");
  });

  it("parses multiple schedule blocks", () => {
    const text =
      "[SCHEDULE]\nin 1 hour\nTask 1\n[/SCHEDULE]\n" +
      "[SCHEDULE]\nin 2 hours\nTask 2\n[/SCHEDULE]";
    const result = parseScheduleBlocks(text);
    expect(result.schedules).toHaveLength(2);
    expect(result.schedules[0].what).toBe("Task 1");
    expect(result.schedules[1].what).toBe("Task 2");
  });

  it("parses cancel blocks", () => {
    const text = "[SCHEDULE_CANCEL]\nRemind me\n[/SCHEDULE_CANCEL]";
    const result = parseScheduleBlocks(text);
    expect(result.cancels).toHaveLength(1);
    expect(result.cancels[0].what).toBe("Remind me");
  });

  it("parses mixed blocks", () => {
    const text =
      "Intro\n[SCHEDULE]\nin 5 minutes\nRemind me\n[/SCHEDULE]\n" +
      "[SCHEDULE_CANCEL]\nRemind me\n[/SCHEDULE_CANCEL]\nOutro";
    const result = parseScheduleBlocks(text);
    expect(result.cleanText).toBe("Intro\n\n\nOutro");
    expect(result.schedules).toHaveLength(1);
    expect(result.cancels).toHaveLength(1);
  });

  it("handles schedule block with single line", () => {
    const text = "[SCHEDULE]\njust a reminder\n[/SCHEDULE]";
    const result = parseScheduleBlocks(text);
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].when).toBe("unknown");
    expect(result.schedules[0].what).toBe("just a reminder");
  });
});
