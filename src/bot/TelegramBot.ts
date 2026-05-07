import { Telegraf, Context } from "telegraf";
import { startServer, stopServer } from "../opencode/Server.js";
import { SessionStore } from "./SessionStore.js";
import { registerCommandHandlers } from "./handlers/CommandHandler.js";
import { registerTextHandler } from "./handlers/TextHandler.js";
import { registerDocumentHandler } from "./handlers/DocumentHandler.js";
import { registerPhotoHandler } from "./handlers/PhotoHandler.js";
import { botConfig } from "../config/bot.config.js";

export async function startBot(): Promise<void> {
  const token = botConfig.telegramBotToken;
  if (!token) {
    console.error("Error: TELEGRAM_BOT_TOKEN is not set.");
    console.error("Create a bot with @BotFather and set the token in .env");
    process.exit(1);
  }

  const allowedChatId = botConfig.allowedChatId;
  const store = new SessionStore();

  await startServer(botConfig.opencodeProjectDir);

  const bot = new Telegraf(token, { handlerTimeout: 900_000 });

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

  registerCommandHandlers(bot, store);
  registerTextHandler(bot, store);
  registerDocumentHandler(bot, store);
  registerPhotoHandler(bot, store);

  bot.launch();
  console.log("Telegram bot started. Press Ctrl+C to stop.");

  process.once("SIGINT", async () => {
    console.log("\n[bot] received SIGINT, shutting down...");
    await stopServer();
    bot.stop("SIGINT");
  });
  process.once("SIGTERM", async () => {
    console.log("\n[bot] received SIGTERM, shutting down...");
    await stopServer();
    bot.stop("SIGTERM");
  });
}
