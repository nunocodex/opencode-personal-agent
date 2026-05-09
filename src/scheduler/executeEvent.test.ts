import { describe, it, expect, vi } from "vitest";
import { executeEvent } from "./executeEvent.js";

describe("executeEvent", () => {
  it("sends message via context", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const event = {
      id: "evt-1",
      chatId: "123",
      what: "hello",
      dueAt: new Date(),
      createdAt: new Date(),
    };
    await executeEvent(event, { sendMessage });
    expect(sendMessage).toHaveBeenCalledWith("123", "hello");
  });

  it("propagates send errors", async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error("send failed"));
    const event = {
      id: "evt-1",
      chatId: "123",
      what: "hello",
      dueAt: new Date(),
      createdAt: new Date(),
    };
    await expect(executeEvent(event, { sendMessage })).rejects.toThrow("send failed");
  });
});
