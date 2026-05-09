import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockCreateSession, mockSendMessage, mockSendReply } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockSendMessage: vi.fn(),
  mockSendReply: vi.fn(),
}));

vi.mock("../../opencode/Client.js", () => ({
  createSession: mockCreateSession,
  sendMessage: mockSendMessage,
}));

vi.mock("../utils/sendReply.js", () => ({
  sendReply: mockSendReply,
}));

vi.mock("../../config/bot.config.js", () => ({
  botConfig: { opencodeProjectDir: "/test/project" },
}));

vi.mock("telegraf", () => ({
  Context: class MockContext {},
}));

vi.mock("telegraf/filters", () => ({
  message: vi.fn((type: string) => `${type}_filter`),
}));

import { registerTextHandler } from "./TextHandler.js";

function createMockCtx(overrides?: any) {
  return {
    chat: { id: 123456 },
    message: { message_id: 42, text: "hello" },
    reply: vi.fn().mockResolvedValue(undefined),
    sendChatAction: vi.fn().mockResolvedValue(undefined),
    telegram: { getFileLink: vi.fn().mockResolvedValue({ href: "https://example.com/file" }) },
    ...overrides,
  };
}

function getHandler(bot: any) {
  const call = bot.on.mock.calls.find(([filter]: [string]) => filter === "text_filter");
  expect(call).toBeDefined();
  return call[1];
}

describe("registerTextHandler", () => {
  let bot: any;
  let store: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockCreateSession.mockReset();
    mockSendMessage.mockReset();
    mockSendReply.mockReset();
    bot = { on: vi.fn() };
    store = {
      get: vi.fn(),
      set: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("success with existing session", async () => {
    store.get.mockReturnValue({
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockResolvedValue({ text: "response text" });

    registerTextHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(store.get).toHaveBeenCalledWith("123456");
    expect(mockSendMessage).toHaveBeenCalledWith("sess-1", "hello");
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "response text", 42);
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("success creating new session", async () => {
    store.get
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({
        sessionId: "new-sess-1",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      });
    mockCreateSession.mockResolvedValue("new-sess-1");
    mockSendMessage.mockResolvedValue({ text: "new response" });

    registerTextHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockCreateSession).toHaveBeenCalledWith("OpenCode Agents chat", "/test/project");
    expect(store.set).toHaveBeenCalledWith("123456", "new-sess-1");
    expect(mockSendMessage).toHaveBeenCalledWith("new-sess-1", "hello");
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "new response", 42);
  });

  it("error during sendMessage", async () => {
    store.get.mockReturnValue({
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockRejectedValue(new Error("send failed"));

    registerTextHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Sorry, I encountered an error processing your request.",
      { reply_to_message_id: 42 }
    );
  });

  it("skips commands", async () => {
    registerTextHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({ message: { message_id: 42, text: "/start" } });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(store.get).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockSendReply).not.toHaveBeenCalled();
  });

  it("skips terminal artifacts", async () => {
    registerTextHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({ message: { message_id: 42, text: "^C" } });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(store.get).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockSendReply).not.toHaveBeenCalled();
  });

  it("missing chatId", async () => {
    registerTextHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({ chat: undefined });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(store.get).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("processes schedule blocks when scheduler is provided", async () => {
    store.get.mockReturnValue({
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockResolvedValue({
      text: "Response\n[SCHEDULE]\nin 5 minutes\nRemind me\n[/SCHEDULE]",
    });

    const mockScheduler = {
      schedule: vi.fn().mockReturnValue("evt-1"),
      cancel: vi.fn().mockReturnValue(false),
      list: vi.fn().mockReturnValue([]),
    };

    registerTextHandler(bot, store, mockScheduler as any);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockScheduler.schedule).toHaveBeenCalledWith("123456", expect.any(Date), "Remind me");
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "Response", 42);
  });
});
