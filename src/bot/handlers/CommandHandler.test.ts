import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatDuration, formatTimeAgo, registerCommandHandlers } from "./CommandHandler.js";
import { deleteSessionHttp } from "../../opencode/Client.js";

vi.mock("../../opencode/Client.js", () => ({ deleteSessionHttp: vi.fn() }));

function createMockCtx(overrides?: Partial<any>) {
  return {
    reply: vi.fn().mockResolvedValue(undefined),
    chat: { id: 123456 },
    ...overrides,
  };
}

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

describe("registerCommandHandlers", () => {
  let bot: any;
  let store: any;
  let pm: any;

  beforeEach(() => {
    bot = { command: vi.fn() };
    store = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };
    pm = {
      getState: vi.fn().mockReturnValue({
        status: "running",
        pid: 123,
        uptimeMs: 60000,
        lastHealthCheck: new Date(),
        startCount: 5,
      }),
      restart: vi.fn().mockResolvedValue(undefined),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function getCommandHandler(name: string) {
    const call = bot.command.mock.calls.find(([cmdName]: [string]) => cmdName === name);
    expect(call).toBeDefined();
    return call[1];
  }

  it("/start calls ctx.reply with welcome text", async () => {
    registerCommandHandlers(bot, store, pm);
    const handler = getCommandHandler("start");
    const ctx = createMockCtx();
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("Welcome"));
  });

  it("/help calls ctx.reply with Markdown parse_mode", async () => {
    registerCommandHandlers(bot, store, pm);
    const handler = getCommandHandler("help");
    const ctx = createMockCtx();
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Available Commands"),
      { parse_mode: "Markdown" }
    );
  });

  it("/new without existing session does NOT call deleteSessionHttp and replies", async () => {
    registerCommandHandlers(bot, store, pm);
    const handler = getCommandHandler("new");
    const ctx = createMockCtx();
    await handler(ctx);
    expect(deleteSessionHttp).not.toHaveBeenCalled();
    expect(store.delete).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Session cleared. Starting a fresh conversation.");
  });

  it("/new with existing session calls deleteSessionHttp, store.delete, and replies", async () => {
    store.get.mockReturnValue({
      sessionId: "sess-123",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
    registerCommandHandlers(bot, store, pm);
    const handler = getCommandHandler("new");
    const ctx = createMockCtx();
    await handler(ctx);
    expect(deleteSessionHttp).toHaveBeenCalledWith("sess-123");
    expect(store.delete).toHaveBeenCalledWith("123456");
    expect(ctx.reply).toHaveBeenCalledWith("Session cleared. Starting a fresh conversation.");
  });

  it("/new missing chatId returns early", async () => {
    registerCommandHandlers(bot, store, pm);
    const handler = getCommandHandler("new");
    const ctx = createMockCtx({ chat: undefined });
    await handler(ctx);
    expect(ctx.reply).not.toHaveBeenCalled();
    expect(deleteSessionHttp).not.toHaveBeenCalled();
  });

  it("/status calls pm.getState() and replies with formatted lines", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date("2024-01-01T00:01:00Z"));
    pm.getState.mockReturnValue({
      status: "running",
      pid: 123,
      uptimeMs: 60000,
      lastHealthCheck: new Date("2024-01-01T00:00:30Z"),
      startCount: 5,
    });
    registerCommandHandlers(bot, store, pm);
    const handler = getCommandHandler("status");
    const ctx = createMockCtx();
    await handler(ctx);
    expect(pm.getState).toHaveBeenCalled();
    const replyArg = ctx.reply.mock.calls[0][0] as string;
    expect(replyArg).toContain("Server: running");
    expect(replyArg).toContain("PID: 123");
    expect(replyArg).toContain("Uptime: 1m 0s");
    expect(replyArg).toContain("Last health check: 30s ago");
    expect(replyArg).toContain("Start count: 5");
  });

  it("/restart success calls pm.restart() and replies", async () => {
    registerCommandHandlers(bot, store, pm);
    const handler = getCommandHandler("restart");
    const ctx = createMockCtx();
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("Restarting OpenCode server...");
    expect(pm.restart).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Server restarted successfully.");
  });

  it("/restart failure replies with error message", async () => {
    pm.restart.mockRejectedValue(new Error("restart crashed"));
    registerCommandHandlers(bot, store, pm);
    const handler = getCommandHandler("restart");
    const ctx = createMockCtx();
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("Restarting OpenCode server...");
    expect(pm.restart).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("Restart failed: restart crashed");
  });
});
