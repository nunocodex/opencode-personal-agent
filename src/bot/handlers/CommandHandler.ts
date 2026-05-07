import { Context } from "telegraf";
import { SessionStore } from "../SessionStore.js";
import { deleteSessionHttp } from "../../opencode/Client.js";

export function registerCommandHandlers(bot: any, store: SessionStore): void {
  bot.command("start", async (ctx: Context) => {
    await ctx.reply(
      "Welcome to OpenCode Agents Bot!\n\n" +
        "I am powered by OpenCode and connect you to AI agents.\n" +
        "Commands:\n" +
        "/start - Show this message\n" +
        "/new - Start a fresh session\n" +
        "/help - Show available commands\n\n" +
        "Just send me a message to start chatting."
    );
  });

  bot.command("help", async (ctx: Context) => {
    await ctx.reply(
      "*Available Commands*\n\n" +
        "/start - Welcome message\n" +
        "/new - Clear current session and start fresh\n" +
        "/help - This message\n\n" +
        "You can also send text, documents, and photos.",
      { parse_mode: "Markdown" }
    );
  });

  bot.command("new", async (ctx: Context) => {
    const chatId = ctx.chat?.id.toString();
    if (!chatId) return;

    const existing = store.get(chatId);
    if (existing) {
      try {
        await deleteSessionHttp(existing.sessionId);
      } catch {
        // ignore cleanup errors
      }
      store.delete(chatId);
    }

    await ctx.reply("Session cleared. Starting a fresh conversation.");
  });
}
