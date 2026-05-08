#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "path";
import { startBot, processManager } from "./bot/TelegramBot.js";

// Load .env
config({ path: resolve(process.cwd(), ".env"), override: true });

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

main().catch(async (err) => {
  console.error("Fatal error:", err);
  try {
    if (processManager) {
      await processManager.stop();
    }
  } catch (stopErr) {
    console.error("Error during shutdown:", stopErr);
  }
  process.exit(1);
});
