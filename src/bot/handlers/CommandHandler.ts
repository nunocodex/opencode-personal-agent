import { Context } from "telegraf";
import { SessionStore } from "../SessionStore.js";
import { deleteSessionHttp } from "../../opencode/Client.js";
import { ProcessManager } from "../../process/ProcessManager.js";

export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return "N/A";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function formatTimeAgo(date: Date | null): string {
  if (!date) return "N/A";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export function registerCommandHandlers(bot: any, store: SessionStore, processManager: ProcessManager): void {
  bot.command("start", async (ctx: Context) => {
    await ctx.reply(
      "Welcome to OpenCode Agents Bot!\n\n" +
        "I am powered by OpenCode and connect you to AI agents.\n" +
        "Commands:\n" +
        "/start - Show this message\n" +
        "/new - Start a fresh session\n" +
        "/status - Show server status\n" +
        "/restart - Restart the OpenCode server\n" +
        "/help - Show available commands\n\n" +
        "Just send me a message to start chatting."
    );
  });

  bot.command("help", async (ctx: Context) => {
    await ctx.reply(
      "*Available Commands*\n\n" +
        "/start - Welcome message\n" +
        "/new - Clear current session and start fresh\n" +
        "/status - Show server status\n" +
        "/restart - Restart the OpenCode server\n" +
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

  bot.command("status", async (ctx: Context) => {
    const state = processManager.getState();
    const lines = [
      `Server: ${state.status}`,
      `PID: ${state.pid ?? "N/A"}`,
      `Uptime: ${formatDuration(state.uptimeMs)}`,
      `Last health check: ${formatTimeAgo(state.lastHealthCheck)}`,
      `Start count: ${state.startCount}`,
    ];
    await ctx.reply(lines.join("\n"));
  });

  bot.command("restart", async (ctx: Context) => {
    await ctx.reply("Restarting OpenCode server...");
    try {
      await processManager.restart();
      await ctx.reply("Server restarted successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.reply(`Restart failed: ${message}`);
    }
  });
}
