import { Telegraf, Context } from "telegraf";
import { ProcessManager } from "../process/ProcessManager.js";
import { SessionStore } from "./SessionStore.js";
import { registerCommandHandlers } from "./handlers/CommandHandler.js";
import { registerTextHandler } from "./handlers/TextHandler.js";
import { registerDocumentHandler } from "./handlers/DocumentHandler.js";
import { registerPhotoHandler } from "./handlers/PhotoHandler.js";
import { registerVoiceHandler } from "./handlers/VoiceHandler.js";
import { botConfig } from "../config/bot.config.js";
import { killAllSpawnedProcesses } from "../voice/spawnAsync.js";
import { EventScheduler } from "../scheduler/EventScheduler.js";

export let processManager: ProcessManager | null = null;
export let eventScheduler: EventScheduler | null = null;

export async function startBot(): Promise<void> {
  const token = botConfig.telegramBotToken;
  if (!token) {
    console.error("Error: TELEGRAM_BOT_TOKEN is not set.");
    console.error("Create a bot with @BotFather and set the token in .env");
    process.exit(1);
  }

  const parsedUrl = new URL(botConfig.opencodeServerUrl);
  processManager = new ProcessManager({
    serverUrl: botConfig.opencodeServerUrl,
    projectDir: botConfig.opencodeProjectDir,
    serverPort: parseInt(parsedUrl.port, 10) || 4096,
    serverHost: parsedUrl.hostname,
    serverUsername: botConfig.opencodeServerUsername,
    serverPassword: botConfig.opencodeServerPassword,
  });

  const allowedChatId = botConfig.allowedChatId;
  const store = new SessionStore();

  await processManager.start();

  const bot = new Telegraf(token, { handlerTimeout: 900_000 });

  eventScheduler = new EventScheduler({
    onExecute: async (event) => {
      try {
        await bot.telegram.sendMessage(event.chatId, event.what);
      } catch (err) {
        console.error(`[scheduler] failed to send to ${event.chatId}:`, err);
      }
    },
  });
  eventScheduler.start();

  // Auth middleware
  bot.use(async (ctx: Context, next) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;
    if (allowedChatId && chatId !== allowedChatId) {
      await ctx.reply("Access denied. Your chat ID is not authorized.");
      console.warn(`Unauthorized access attempt from chat ID: ${chatId}`);
      return;
    }
    await next();
  });

  registerCommandHandlers(bot, store, processManager);
  registerTextHandler(bot, store, eventScheduler);
  registerDocumentHandler(bot, store, eventScheduler);
  registerPhotoHandler(bot, store, eventScheduler);
  registerVoiceHandler(bot, store, eventScheduler);

  bot.launch();
  console.log("Telegram bot started. Press Ctrl+C to stop.");

  let shutdownInProgress = false;
  const shutdown = async (signal: string) => {
    if (shutdownInProgress) {
      console.log(`[bot] received ${signal} again, forcing exit...`);
      process.exit(1);
    }
    shutdownInProgress = true;
    console.log(`\n[bot] received ${signal}, shutting down...`);
    if (eventScheduler) {
      eventScheduler.stop();
    }
    if (processManager) {
      await processManager.stop();
    }
    killAllSpawnedProcesses();
    bot.stop(signal);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}
