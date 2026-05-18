import { describe, it, expect } from "vitest";
import { splitMessage, isJsonResponse } from "../../src/bot/utils";

describe("splitMessage", () => {
  it("returns single chunk for short text", () => {
    const chunks = splitMessage("hello");
    expect(chunks).toEqual(["hello"]);
  });

  it("splits long text at newlines", () => {
    const long =
      "a".repeat(4000) + "\n" + "b".repeat(4000) + "\n" + "c".repeat(100);
    const chunks = splitMessage(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });

  it("splits at spaces if no newlines", () => {
    const long = "a ".repeat(3000) + "b ".repeat(2000);
    const chunks = splitMessage(long);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("splits mid-word as last resort", () => {
    const long = "x".repeat(5000);
    const chunks = splitMessage(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });
});

describe("isJsonResponse", () => {
  it("detects JSON objects", () => {
    expect(isJsonResponse('{"key": "value"}')).toBe(true);
  });

  it("detects JSON arrays", () => {
    expect(isJsonResponse("[1, 2, 3]")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(isJsonResponse("Hello world")).toBe(false);
  });
});
