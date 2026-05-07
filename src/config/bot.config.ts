import { config } from "dotenv";
import { resolve } from "path";

// Load .env before any config access
config({ path: resolve(process.cwd(), ".env") });

export interface BotConfig {
  telegramBotToken: string;
  allowedChatId?: string;
  opencodeProjectDir: string;
  opencodeServerUrl: string;
  opencodeServerUsername?: string;
  opencodeServerPassword?: string;
}

function getEnv(key: string, required: true): string;
function getEnv(key: string, required?: false): string | undefined;
function getEnv(key: string, required = false): string | undefined {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Environment variable ${key} is required`);
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
