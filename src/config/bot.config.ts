import { config } from "dotenv";
import { resolve } from "path";

// Load .env before any config access
config({ path: resolve(process.cwd(), ".env"), override: true });

export interface BotConfig {
  telegramBotToken: string;
  allowedChatId?: string;
  opencodeProjectDir: string;
  opencodeServerUrl: string;
  opencodeServerUsername?: string;
  opencodeServerPassword?: string;
}

export function getEnv(key: string, required: true): string;
export function getEnv(key: string, required?: false): string | undefined;
export function getEnv(key: string, required = false): string | undefined {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  if (key === "TELEGRAM_BOT_TOKEN" && value) {
    const trimmed = value.trim();
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(trimmed)) {
      throw new Error(
        `Invalid TELEGRAM_BOT_TOKEN format. ` +
          `Expected: 123456789:ABCdef... ` +
          `Got length ${trimmed.length}. ` +
          `Check .env for quotes, spaces, or newlines.`
      );
    }
    return trimmed;
  }
  return value;
}

export const botConfig: BotConfig = {
  telegramBotToken: getEnv("TELEGRAM_BOT_TOKEN", true)!,
  allowedChatId: getEnv("ALLOWED_CHAT_ID"),
  opencodeProjectDir: getEnv("OPENCODE_PROJECT_DIR") ?? process.cwd(),
  opencodeServerUrl: getEnv("OPENCODE_SERVER_URL") ?? "http://127.0.0.1:4096",
  opencodeServerUsername: getEnv("OPENCODE_SERVER_USERNAME"),
  opencodeServerPassword: getEnv("OPENCODE_SERVER_PASSWORD"),
};
