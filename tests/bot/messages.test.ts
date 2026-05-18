import { describe, it, expect } from "vitest";
import { messages } from "../../src/bot/messages";

describe("messages", () => {
  it("has all required keys", () => {
    expect(messages.start).toBeTruthy();
    expect(messages.help).toBeTruthy();
    expect(messages.newSession).toBeTruthy();
    expect(messages.sessionActive(0)).toContain("0");
    expect(messages.noSession).toBeTruthy();
    expect(messages.accessDenied).toBeTruthy();
    expect(messages.unsupportedFormat).toBeTruthy();
    expect(messages.opencodeError).toBeTruthy();
    expect(messages.mediaError).toBeTruthy();
    expect(messages.voiceNotImplemented).toBeTruthy();
  });

  it("contains markdown formatting in start message", () => {
    expect(messages.start).toContain("*");
  });
});
