import { Bot } from "grammy";
import type { Config } from "../config";
import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import { checkAuth } from "./utils";
import { messages } from "./messages";
import {
  startHandler,
  helpHandler,
  newSessionHandler,
  statusHandler,
  textHandler,
} from "./handlers";
import { photoHandler, documentHandler, voiceHandler } from "./media";

export function createBot(config: Config, client: OpencodeClient): Bot {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  bot.use(async (ctx, next) => {
    if (!checkAuth(ctx, config.TELEGRAM_ALLOWED_USER_ID)) {
      await ctx.reply(messages.accessDenied);
      return;
    }
    await next();
  });

  bot.command("start", startHandler);
  bot.command("help", helpHandler);
  bot.command("new", newSessionHandler(config, client));
  bot.command("status", statusHandler());

  bot.on("message:text", textHandler(config, client));
  bot.on("message:photo", photoHandler(config, client));
  bot.on("message:document", documentHandler(config, client));
  bot.on("message:voice", voiceHandler(config, client));

  return bot;
}
