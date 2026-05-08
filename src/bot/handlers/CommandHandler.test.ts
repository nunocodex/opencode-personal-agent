import { describe, it, expect } from "vitest";
import { formatDuration, formatTimeAgo } from "./CommandHandler.js";

describe("formatDuration", () => {
  it("null returns N/A", () => {
    expect(formatDuration(null)).toBe("N/A");
  });

  it("0 returns 0m 0s", () => {
    expect(formatDuration(0)).toBe("0m 0s");
  });

  it("30000 returns 0m 30s", () => {
    expect(formatDuration(30000)).toBe("0m 30s");
  });

  it("125000 returns 2m 5s", () => {
    expect(formatDuration(125000)).toBe("2m 5s");
  });

  it("negative returns N/A", () => {
    expect(formatDuration(-1)).toBe("N/A");
  });
});

describe("formatTimeAgo", () => {
  it("null returns N/A", () => {
    expect(formatTimeAgo(null)).toBe("N/A");
  });

  it("just now returns Xs ago", () => {
    const now = new Date();
    const result = formatTimeAgo(now);
    expect(result).toMatch(/^\d+s ago$/);
    expect(result).toBe("0s ago");
  });

  it("90 seconds ago returns 1m ago", () => {
    const date = new Date(Date.now() - 90 * 1000);
    expect(formatTimeAgo(date)).toBe("1m ago");
  });

  it("future date returns just now", () => {
    const future = new Date(Date.now() + 10000);
    expect(formatTimeAgo(future)).toBe("just now");
  });
});
