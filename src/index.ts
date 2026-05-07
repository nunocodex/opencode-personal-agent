#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "path";
import { startBot } from "./bot/TelegramBot.js";

// Load .env
config({ path: resolve(process.cwd(), ".env") });

async function main(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (token) {
    await startBot();
  } else {
    console.log("OpenCode Agents project initialized.");
    console.log("Run 'opencode' to start the interactive session.");
    console.log("To start the Telegram bot, set TELEGRAM_BOT_TOKEN in .env");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
