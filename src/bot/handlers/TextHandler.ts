import { Context } from "telegraf";
import { message } from "telegraf/filters";
import { SessionStore } from "../SessionStore.js";
import { createSession, sendMessage } from "../../opencode/Client.js";
import { sendReply } from "../utils/sendReply.js";
import { botConfig } from "../../config/bot.config.js";
import { processScheduleBlocks } from "../utils/processScheduleBlocks.js";
import type { EventScheduler } from "../../scheduler/EventScheduler.js";

export function registerTextHandler(bot: any, store: SessionStore, scheduler?: EventScheduler): void {
  bot.on(message("text"), async (ctx: Context) => {
    const chatId = ctx.chat?.id.toString();
    const text = (ctx.message as any)?.text;
    if (!chatId || !text) return;

    // Skip commands
    if (text.startsWith("/")) return;

    // Skip terminal artifacts
    if (/^\^./.test(text)) return;

    console.log(`[bot] received message from chat ${chatId}: ${text.slice(0, 50)}...`);

    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {});
    }, 4000);

    try {
      let sessionEntry = store.get(chatId);
      if (!sessionEntry) {
        const sessionId = await createSession("OpenCode Agents chat", botConfig.opencodeProjectDir);
        store.set(chatId, sessionId);
        sessionEntry = store.get(chatId)!;
        console.log(`[bot] created new session ${sessionId} for chat ${chatId}`);
      }

      const response = await sendMessage(sessionEntry.sessionId, text);
      clearInterval(typingInterval);

      let responseText = response.text ?? "(no response)";
      if (scheduler) {
        const { cleanText } = processScheduleBlocks(chatId, responseText, scheduler);
        responseText = cleanText || "(no response)";
      }

      await sendReply(ctx, responseText, ctx.message?.message_id);
    } catch (err) {
      clearInterval(typingInterval);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[bot] error processing text from chat ${chatId}: ${errorMessage}`);
      await ctx.reply(
        "Sorry, I encountered an error processing your request.",
        { reply_to_message_id: ctx.message?.message_id } as any
      );
    }
  });
}
