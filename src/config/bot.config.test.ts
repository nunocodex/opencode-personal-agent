import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

describe("bot.config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Ensure TELEGRAM_BOT_TOKEN is always valid before import to prevent module-level throw
    process.env.TELEGRAM_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
    delete process.env.ALLOWED_CHAT_ID;
    delete process.env.OPENCODE_PROJECT_DIR;
    delete process.env.OPENCODE_SERVER_URL;
    delete process.env.OPENCODE_SERVER_USERNAME;
    delete process.env.OPENCODE_SERVER_PASSWORD;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function importConfig() {
    return import("./bot.config.js");
  }

  it("getEnv with required variable present returns value", async () => {
    const { getEnv } = await importConfig();
    expect(getEnv("TELEGRAM_BOT_TOKEN", true)).toBe("123456789:ABCdefGHIjklMNOpqrsTUVwxyz");
  });

  it("getEnv with required variable missing throws Error", async () => {
    const { getEnv } = await importConfig();
    expect(() => getEnv("MISSING_VAR_XYZ", true)).toThrow(
      "Environment variable MISSING_VAR_XYZ is required"
    );
  });

  it("getEnv with optional variable missing returns undefined", async () => {
    const { getEnv } = await importConfig();
    expect(getEnv("ALLOWED_CHAT_ID")).toBeUndefined();
  });

  it("TELEGRAM_BOT_TOKEN rejects too short format", async () => {
    const { getEnv } = await importConfig();
    process.env.TELEGRAM_BOT_TOKEN = "short";
    expect(() => getEnv("TELEGRAM_BOT_TOKEN", true)).toThrow(/Invalid TELEGRAM_BOT_TOKEN/);
  });

  it("TELEGRAM_BOT_TOKEN rejects missing colon", async () => {
    const { getEnv } = await importConfig();
    process.env.TELEGRAM_BOT_TOKEN = "123456789ABCdefGHIjkl";
    expect(() => getEnv("TELEGRAM_BOT_TOKEN", true)).toThrow(/Invalid TELEGRAM_BOT_TOKEN/);
  });

  it("TELEGRAM_BOT_TOKEN rejects non-numeric prefix", async () => {
    const { getEnv } = await importConfig();
    process.env.TELEGRAM_BOT_TOKEN = "abc:ABCdefGHIjklMNOpqrs";
    expect(() => getEnv("TELEGRAM_BOT_TOKEN", true)).toThrow(/Invalid TELEGRAM_BOT_TOKEN/);
  });

  it("TELEGRAM_BOT_TOKEN accepts valid format", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
    const { getEnv } = await importConfig();
    expect(getEnv("TELEGRAM_BOT_TOKEN", true)).toBe("123456789:ABCdefGHIjklMNOpqrsTUVwxyz");
  });

  it("botConfig has correct defaults when env vars are missing", async () => {
    const { botConfig } = await importConfig();
    expect(botConfig.telegramBotToken).toBe("123456789:ABCdefGHIjklMNOpqrsTUVwxyz");
    expect(botConfig.opencodeProjectDir).toBe(process.cwd());
    expect(botConfig.opencodeServerUrl).toBe("http://127.0.0.1:4096");
    expect(botConfig.allowedChatId).toBeUndefined();
    expect(botConfig.opencodeServerUsername).toBeUndefined();
    expect(botConfig.opencodeServerPassword).toBeUndefined();
  });

  it("botConfig reads env vars when present", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
    process.env.ALLOWED_CHAT_ID = "12345";
    process.env.OPENCODE_PROJECT_DIR = "/some/dir";
    process.env.OPENCODE_SERVER_URL = "http://localhost:8080";
    process.env.OPENCODE_SERVER_USERNAME = "admin";
    process.env.OPENCODE_SERVER_PASSWORD = "secret";

    const { botConfig } = await importConfig();
    expect(botConfig.telegramBotToken).toBe("123456789:ABCdefGHIjklMNOpqrsTUVwxyz");
    expect(botConfig.allowedChatId).toBe("12345");
    expect(botConfig.opencodeProjectDir).toBe("/some/dir");
    expect(botConfig.opencodeServerUrl).toBe("http://localhost:8080");
    expect(botConfig.opencodeServerUsername).toBe("admin");
    expect(botConfig.opencodeServerPassword).toBe("secret");
  });
});
