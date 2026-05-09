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
  createSession: mockCreateSession,
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

import { registerPhotoHandler } from "./PhotoHandler.js";

function createMockCtx(overrides?: any) {
  return {
    chat: { id: 123456 },
    message: {
      message_id: 42,
      photo: [{ file_id: "p1" }, { file_id: "p2" }],
      caption: "",
    },
    reply: vi.fn().mockResolvedValue(undefined),
    sendChatAction: vi.fn().mockResolvedValue(undefined),
    telegram: { getFileLink: vi.fn().mockResolvedValue({ href: "https://example.com/photo" }) },
    ...overrides,
  };
}

function getHandler(bot: any) {
  const call = bot.on.mock.calls.find(([filter]: [string]) => filter === "photo_filter");
  expect(call).toBeDefined();
  return call[1];
}

describe("registerPhotoHandler", () => {
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
    mockSendMessage.mockResolvedValue({ text: "photo response" });

    registerPhotoHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({
      message: {
        message_id: 42,
        photo: [{ file_id: "p1" }, { file_id: "p2" }],
        caption: "analyze this",
      },
    });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.telegram.getFileLink).toHaveBeenCalledWith("p2");
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/photo");
    expect(mockFromWeb).toHaveBeenCalledWith({ some: "body" });
    expect(mockCreateWriteStream).toHaveBeenCalledWith("/test/project/workspace/uploads/photo_42.jpg");
    expect(mockPipeline).toHaveBeenCalled();
    expect(mockSendMessage).toHaveBeenCalledWith(
      "sess-1",
      "User: analyze this\n\nLook at the image at /test/project/workspace/uploads/photo_42.jpg and act on the user's request."
    );
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "photo response", 42);
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
    mockSendMessage.mockResolvedValue({ text: "photo response no caption" });

    registerPhotoHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockSendMessage).toHaveBeenCalledWith(
      "sess-1",
      "User sent an image: photo_42.jpg\n\nLook at the image at /test/project/workspace/uploads/photo_42.jpg and describe what you see."
    );
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "photo response no caption", 42);
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

    registerPhotoHandler(bot, store);
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
      status: 500,
    });

    registerPhotoHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Sorry, I failed to process the photo.",
      { reply_to_message_id: 42 }
    );
  });

  it("missing photos array", async () => {
    registerPhotoHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx({ message: { message_id: 42, caption: "", photo: undefined } });
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
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

    registerPhotoHandler(bot, store);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(ctx.reply).toHaveBeenCalledWith(
      "Sorry, I failed to process the photo.",
      { reply_to_message_id: 42 }
    );
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

    registerPhotoHandler(bot, store, mockScheduler as any);
    const handler = getHandler(bot);
    const ctx = createMockCtx();
    await handler(ctx);
    await vi.advanceTimersByTimeAsync(1);

    expect(mockScheduler.schedule).toHaveBeenCalledWith("123456", expect.any(Date), "Remind me");
    expect(mockSendReply).toHaveBeenCalledWith(ctx, "Response", 42);
  });
});
