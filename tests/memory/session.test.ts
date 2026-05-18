import { describe, it, expect } from "vitest";
import {
  getSession,
  setSession,
  deleteSession,
  hasSession,
  sessionCount,
} from "../../src/memory/session";

describe("session store", () => {
  it("stores and retrieves sessions", () => {
    setSession(123, "session-1");
    expect(getSession(123)).toBe("session-1");
  });

  it("returns undefined for unknown users", () => {
    expect(getSession(999)).toBeUndefined();
  });

  it("deletes sessions", () => {
    setSession(456, "session-2");
    expect(deleteSession(456)).toBe(true);
    expect(hasSession(456)).toBe(false);
  });

  it("tracks session count", () => {
    expect(sessionCount()).toBeGreaterThanOrEqual(0);
    setSession(1, "s1");
    setSession(2, "s2");
    expect(sessionCount()).toBeGreaterThanOrEqual(2);
  });
});
