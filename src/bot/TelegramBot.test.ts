import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

var mockToken = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
var mockAllowedChatId: string | undefined = "123456";

vi.mock("../config/bot.config.js", () => ({
  get botConfig() {
    return {
      telegramBotToken: mockToken,
      allowedChatId: mockAllowedChatId,
      opencodeProjectDir: "/project",
      opencodeServerUrl: "http://127.0.0.1:4096",
      opencodeServerUsername: undefined,
      opencodeServerPassword: undefined,
    };
  },
}));

const mockPmStart = vi.fn().mockResolvedValue(undefined);
const mockPmStop = vi.fn().mockResolvedValue(undefined);
const mockPmGetState = vi.fn().mockReturnValue({
  status: "running",
  pid: 123,
  uptimeMs: 60000,
  lastHealthCheck: new Date(),
  startCount: 1,
});
const mockPmRestart = vi.fn().mockResolvedValue(undefined);

vi.mock("../process/ProcessManager.js", () => ({
  ProcessManager: vi.fn().mockImplementation(function () {
    return {
      start: mockPmStart,
      stop: mockPmStop,
      getState: mockPmGetState,
      restart: mockPmRestart,
    };
  }),
}));

const mockBotLaunch = vi.fn();
const mockBotStop = vi.fn();
const mockBotUse = vi.fn();
const mockBotCommand = vi.fn();
const mockBotOn = vi.fn();

vi.mock("telegraf", () => ({
  Telegraf: vi.fn().mockImplementation(function () {
    return {
      launch: mockBotLaunch,
      stop: mockBotStop,
      use: mockBotUse,
      command: mockBotCommand,
      on: mockBotOn,
    };
  }),
  Context: class MockContext {},
}));

import { startBot, processManager } from "./TelegramBot.js";
import { ProcessManager } from "../process/ProcessManager.js";

describe("TelegramBot", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
    mockAllowedChatId = "123456";
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  describe("startBot", () => {
    it("with missing token logs errors and calls process.exit(1)", async () => {
      mockToken = "";
      await startBot();
      expect(errorSpy).toHaveBeenCalledWith("Error: TELEGRAM_BOT_TOKEN is not set.");
      expect(errorSpy).toHaveBeenCalledWith("Create a bot with @BotFather and set the token in .env");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("with valid token creates ProcessManager, starts it, instantiates Telegraf, registers handlers, launches bot", async () => {
      await startBot();
      expect(processManager).not.toBeNull();
      expect(ProcessManager).toHaveBeenCalledTimes(1);
      expect(mockPmStart).toHaveBeenCalledTimes(1);
      expect(mockBotLaunch).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith("Telegram bot started. Press Ctrl+C to stop.");
      expect(mockBotUse).toHaveBeenCalled();
      expect(mockBotCommand).toHaveBeenCalled();
      expect(mockBotOn).toHaveBeenCalled();
    });
  });

  describe("auth middleware", () => {
    it("allows authorized chat and calls next()", async () => {
      await startBot();
      const middleware = mockBotUse.mock.calls[0][0];
      const next = vi.fn().mockResolvedValue(undefined);
      const ctx = {
        chat: { id: 123456 },
        reply: vi.fn().mockResolvedValue(undefined),
      };
      await middleware(ctx, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it("denies unauthorized chat when allowedChatId is set", async () => {
      await startBot();
      const middleware = mockBotUse.mock.calls[0][0];
      const next = vi.fn().mockResolvedValue(undefined);
      const ctx = {
        chat: { id: 999999 },
        reply: vi.fn().mockResolvedValue(undefined),
      };
      await middleware(ctx, next);
      expect(next).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith("Access denied. Your chat ID is not authorized.");
      expect(warnSpy).toHaveBeenCalledWith("Unauthorized access attempt from chat ID: 999999");
    });

    it("allows any chat when allowedChatId is unset", async () => {
      mockAllowedChatId = undefined;
      await startBot();
      const middleware = mockBotUse.mock.calls[0][0];
      const next = vi.fn().mockResolvedValue(undefined);
      const ctx = {
        chat: { id: 999999 },
        reply: vi.fn().mockResolvedValue(undefined),
      };
      await middleware(ctx, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.reply).not.toHaveBeenCalled();
    });
  });

  describe("shutdown handlers", () => {
    it("SIGINT calls pm.stop() and bot.stop('SIGINT')", async () => {
      await startBot();
      const sigintListener = process.listeners("SIGINT")[0];
      expect(sigintListener).toBeDefined();
      sigintListener("SIGINT");
      await Promise.resolve();
      await Promise.resolve();
      expect(mockPmStop).toHaveBeenCalledTimes(1);
      expect(mockBotStop).toHaveBeenCalledWith("SIGINT");
    });

    it("double SIGINT calls process.exit(1)", async () => {
      await startBot();
      const sigintListener = process.listeners("SIGINT")[0];
      sigintListener("SIGINT");
      sigintListener("SIGINT");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
