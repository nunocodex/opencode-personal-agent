import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const {
  mockCreateSession,
  mockSendMessage,
  mockSendReply,
  mockExistsSync,
  mockMkdirSync,
  mockCreateWriteStream,
  mockPipeline,
  mockFromWeb,
  mockResolve,
  mockFetch,
} = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockSendMessage: vi.fn(),
  mockSendReply: vi.fn(),
  mockExistsSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockCreateWriteStream: vi.fn(),
  mockPipeline: vi.fn(),
  mockFromWeb: vi.fn(),
  mockResolve: vi.fn((...args: string[]) => args.join("/")),
  mockFetch: vi.fn(),
}));

vi.mock("../../opencode/Client.js", () => ({
  initializeSession: mockCreateSession,
  sendMessage: mockSendMessage,
}));

vi.mock("../utils/sendReply.js", () => ({
  sendReply: mockSendReply,
}));

vi.mock("../../config/bot.config.js", () => ({
  botConfig: { opencodeProjectDir: "/test/project" },
}));

vi.mock("fs", () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  createWriteStream: mockCreateWriteStream,
}));

vi.mock("stream/promises", () => ({
  pipeline: mockPipeline,
}));

vi.mock("stream", () => ({
  Readable: {
    fromWeb: mockFromWeb,
  },
}));

vi.mock("path", () => ({
  resolve: mockResolve,
}));

vi.mock("telegraf", () => ({
  Context: class MockContext {},
}));

vi.mock("telegraf/filters", () => ({
  message: vi.fn((type: string) => `${type}_filter`),
}));

vi.stubGlobal("fetch", mockFetch);

import { registerDocumentHandler } from "./DocumentHandler.js";

function createMockCtx(overrides?: any) {
  return {
    chat: { id: 123456 },
    message: {
      message_id: 42,
      document: { file_id: "doc1", file_name: "test.txt" },
      caption: "",
    },
    reply: vi.fn().mockResolvedValue(undefined),
    sendChatAction: vi.fn().mockResolvedValue(undefined),
    telegram: { getFileLink: vi.fn().mockResolvedValue({ href: "https://example.com/file" }) },
    ...overrides,
  };
}

function getHandler(bot: any) {
  const call = bot.on.mock.calls.find(([filter]: [string]) => filter === "document_filter");
  expect(call).toBeDefined();
  return call[1];
}

describe("registerDocumentHandler", () => {
  let bot: any;
  let store: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockCreateSession.mockReset();
    mockSendMessage.mockReset();
    mockSendReply.mockReset();
    mockExistsSync.mockReset();
    mockMkdirSync.mockReset();
    mockCreateWriteStream.mockReset();
    mockPipeline.mockReset();
    mockFromWeb.mockReset();
    bot = { on: vi.fn() };
    store = {
      get: vi.fn(),
      set: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("success with caption", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      body: { some: "body" },
    });
    mockFromWeb.mockReturnValue({ pipe: vi.fn() });
    mockPipeline.mockResolvedValue(undefined);
    store.get.mockReturnValue({
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockResolvedValue({ text: "doc response" });

    registerDocumentHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({
      message: {
        message_id: 42,
        document: { file_id: "doc1", file_name: "test.txt" },
        caption: "read this file",
      },
    });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.telegram.getFileLink).toHaveBeenCalledWith("doc1");
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/file");
    expect(mockFromWeb).toHaveBeenCalledWith({ some: "body" });
    expect(mockCreateWriteStream).toHaveBeenCalledWith("/test/project/workspace/uploads/test.txt");
    expect(mockPipeline).toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(
      "sess-1",
      "User: read this file\n\nRead the file at /test/project/workspace/uploads/test.txt and act on the user's request."
    );
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "doc response", 42);
  });

  it("success without caption", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      body: { some: "body" },
    });
    mockFromWeb.mockReturnValue({ pipe: vi.fn() });
    mockPipeline.mockResolvedValue(undefined);
    store.get.mockReturnValue({
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockResolvedValue({ text: "doc response no caption" });

    registerDocumentHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockSendMessage).toHaveBeenCalledWith(
      "sess-1",
      "User sent a file: test.txt\n\nRead the file at /test/project/workspace/uploads/test.txt and do what seems appropriate."
    );
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "doc response no caption", 42);
  });

  it("creates uploads dir", async () => {
    mockExistsSync.mockReturnValue(false);
    mockFetch.mockResolvedValue({
      ok: true,
      body: { some: "body" },
    });
    mockFromWeb.mockReturnValue({ pipe: vi.fn() });
    mockPipeline.mockResolvedValue(undefined);
    store.get.mockReturnValue({
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockResolvedValue({ text: "response" });

    registerDocumentHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockMkdirSync).toHaveBeenCalledWith("/test/project/workspace/uploads", { recursive: true });
  });

  it("download fails (fetch non-ok)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    registerDocumentHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Sorry, I failed to process the document.",
      { reply_to_message_id: 42 }
    );
  });

  it("download fails (no body)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      body: null,
    });

    registerDocumentHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Sorry, I failed to process the document.",
      { reply_to_message_id: 42 }
    );
  });

  it("pipeline fails", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      body: { some: "body" },
    });
    mockFromWeb.mockReturnValue({ pipe: vi.fn() });
    mockPipeline.mockRejectedValue(new Error("pipeline error"));

    registerDocumentHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Sorry, I failed to process the document.",
      { reply_to_message_id: 42 }
    );
  });

  it("sendMessage fails", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      body: { some: "body" },
    });
    mockFromWeb.mockReturnValue({ pipe: vi.fn() });
    mockPipeline.mockResolvedValue(undefined);
    store.get.mockReturnValue({
      sessionId: "sess-1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    mockSendMessage.mockRejectedValue(new Error("send failed"));

    registerDocumentHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Sorry, I failed to process the document.",
      { reply_to_message_id: 42 }
    );
  });

  it("missing chatId", async () => {
    registerDocumentHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({ chat: undefined });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("missing doc", async () => {
    registerDocumentHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({ message: { message_id: 42, caption: "", document: undefined } });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it("processes schedule blocks when scheduler is provided", async () => {
    mockExistsSync.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ok: true,
      body: { some: "body" },
    });
    mockFromWeb.mockReturnValue({ pipe: vi.fn() });
    mockPipeline.mockResolvedValue(undefined);
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

    registerDocumentHandler(bot, store, mockScheduler as any);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockScheduler.schedule).toHaveBeenCalledWith("123456", expect.any(Date), "Remind me");
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "Response", 42);
  });
});
