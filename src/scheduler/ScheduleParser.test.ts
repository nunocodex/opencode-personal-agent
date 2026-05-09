import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseSchedule } from "./ScheduleParser.js";

describe("parseSchedule", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses 'in X minutes'", () => {
    const result = parseSchedule("in 5 minutes");
    expect(result).toEqual(new Date("2026-05-09T12:05:00.000Z"));
  });

  it("parses 'in X mins'", () => {
    const result = parseSchedule("in 10 mins");
    expect(result).toEqual(new Date("2026-05-09T12:10:00.000Z"));
  });

  it("parses 'in X hours'", () => {
    const result = parseSchedule("in 2 hours");
    expect(result).toEqual(new Date("2026-05-09T14:00:00.000Z"));
  });

  it("parses 'in X days'", () => {
    const result = parseSchedule("in 1 day");
    expect(result).toEqual(new Date("2026-05-10T12:00:00.000Z"));
  });

  it("parses 'at ISO date'", () => {
    const result = parseSchedule("at 2026-05-10 14:30");
    expect(result).toEqual(new Date("2026-05-10 14:30"));
  });

  it("parses 'tomorrow at time'", () => {
    const result = parseSchedule("tomorrow at 9:00");
    // new Date("2026-05-10 09:00") uses local timezone; compare via same constructor
    const expected = new Date("2026-05-10 09:00");
    expect(result).toEqual(expected);
  });

  it("parses plain ISO string", () => {
    const result = parseSchedule("2026-05-10T08:00:00.000Z");
    expect(result).toEqual(new Date("2026-05-10T08:00:00.000Z"));
  });

  it("returns null for invalid input", () => {
    expect(parseSchedule("sometime later")).toBeNull();
    expect(parseSchedule("")).toBeNull();
  });
});
