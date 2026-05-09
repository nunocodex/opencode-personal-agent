import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const {
  mockTranscribeVoice,
  mockCreateSession,
  mockSendMessage,
  mockSendReply,
} = vi.hoisted(() => ({
  mockTranscribeVoice: vi.fn(),
  mockCreateSession: vi.fn(),
  mockSendMessage: vi.fn(),
  mockSendReply: vi.fn(),
}));

vi.mock("../../voice/transcribe.js", () => ({
  transcribeVoice: mockTranscribeVoice,
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

import { registerVoiceHandler } from "./VoiceHandler.js";

function createMockCtx(overrides?: any) {
  return {
    chat: { id: 123456 },
    message: {
      message_id: 42,
      voice: { file_id: "voice1", duration: 5 },
      caption: "",
    },
    reply: vi.fn().mockResolvedValue(undefined),
    sendChatAction: vi.fn().mockResolvedValue(undefined),
    telegram: { getFileLink: vi.fn().mockResolvedValue({ href: "https://example.com/voice.ogg" }) },
    ...overrides,
  };
}

function getHandler(bot: any) {
  const call = bot.on.mock.calls.find(([filter]: [string]) => filter === "voice_filter");
  expect(call).toBeDefined();
  return call[1];
}

describe("registerVoiceHandler", () => {
  let bot: any;
  let store: any;
  let sessionMap: Map<string, any>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockTranscribeVoice.mockReset();
    mockCreateSession.mockReset();
    mockSendMessage.mockReset();
    mockSendReply.mockReset();
    bot = { on: vi.fn() };
    sessionMap = new Map<string, any>();
    store = {
      get: vi.fn((chatId: string) => sessionMap.get(chatId)),
      set: vi.fn((chatId: string, sessionId: string) => {
        sessionMap.set(chatId, {
          sessionId,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        });
      }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("success with existing session", async () => {
    mockTranscribeVoice.mockResolvedValue("hello world");
    sessionMap.set("123456", {
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockResolvedValue({ text: "ai response" });

    registerVoiceHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.telegram.getFileLink).toHaveBeenCalledWith("voice1");
    expect(mockTranscribeVoice).toHaveBeenCalledWith("https://example.com/voice.ogg", undefined);
    expect(mockSendMessage).toHaveBeenCalledWith(
      "sess-1",
      "User sent a voice message. Transcription: hello world"
    );
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "ai response", 42);
  });

  it("success with caption", async () => {
    mockTranscribeVoice.mockResolvedValue("hello world");
    sessionMap.set("123456", {
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockResolvedValue({ text: "ai response" });

    registerVoiceHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({
      message: {
        message_id: 42,
        voice: { file_id: "voice1", duration: 5 },
        caption: "check this out",
      },
    });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockSendMessage).toHaveBeenCalledWith(
      "sess-1",
      "User: check this out\n\nTranscription of voice message: hello world"
    );
  });

  it("creates new session when none exists", async () => {
    mockTranscribeVoice.mockResolvedValue("transcribed");
    mockCreateSession.mockResolvedValue("sess-new");
    mockSendMessage.mockResolvedValue({ text: "response" });

    registerVoiceHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockCreateSession).toHaveBeenCalledWith("OpenCode Agents chat", "/test/project");
    expect(store.set).toHaveBeenCalledWith("123456", "sess-new");
    expect(mockSendMessage).toHaveBeenCalledWith(expect.any(String), expect.any(String));
  });

  it("replies with error on transcription failure", async () => {
    mockTranscribeVoice.mockRejectedValue(new Error("download failed"));

    registerVoiceHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Sorry, I failed to process the voice message.",
      { reply_to_message_id: 42 }
    );
  });

  it("missing chatId returns early", async () => {
    registerVoiceHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({ chat: undefined });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockTranscribeVoice).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("missing voice returns early", async () => {
    registerVoiceHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({ message: { message_id: 42, voice: undefined, caption: "" } });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockTranscribeVoice).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("sendMessage failure replies with error", async () => {
    mockTranscribeVoice.mockResolvedValue("transcribed");
    sessionMap.set("123456", {
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockRejectedValue(new Error("send failed"));

    registerVoiceHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Sorry, I failed to process the voice message.",
      { reply_to_message_id: 42 }
    );
  });
});
