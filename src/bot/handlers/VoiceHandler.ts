import { Context } from "telegraf";
import { message } from "telegraf/filters";
import { SessionStore } from "../SessionStore.js";
import { createSession, sendMessage } from "../../opencode/Client.js";
import { sendReply } from "../utils/sendReply.js";
import { botConfig } from "../../config/bot.config.js";
import { transcribeVoice } from "../../voice/transcribe.js";

export function registerVoiceHandler(bot: any, store: SessionStore): void {
  bot.on(message("voice"), async (ctx: Context) => {
    const chatId = ctx.chat?.id.toString();
    const voice = (ctx.message as any)?.voice;
    if (!chatId || !voice) return;

    console.log(`[bot] received voice from chat ${chatId}: ${voice.file_id}`);

    await ctx.sendChatAction("typing");
    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {});
    }, 4000);

    try {
      const fileLink = await ctx.telegram.getFileLink(voice.file_id);
      const text = await transcribeVoice(fileLink.href);

      let prompt: string;
      const caption = (ctx.message as any)?.caption ?? "";
      if (caption) {
        prompt = `User: ${caption}\n\nTranscription of voice message: ${text}`;
      } else {
        prompt = `User sent a voice message. Transcription: ${text}`;
      }

      let sessionEntry = store.get(chatId);
      if (!sessionEntry) {
        const sessionId = await createSession("OpenCode Agents chat", botConfig.opencodeProjectDir);
        store.set(chatId, sessionId);
        sessionEntry = store.get(chatId)!;
      }

      const response = await sendMessage(sessionEntry.sessionId, prompt);
      clearInterval(typingInterval);

      await sendReply(ctx, response.text ?? "(no response)", ctx.message?.message_id);
    } catch (err) {
      clearInterval(typingInterval);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[bot] error processing voice from chat ${chatId}: ${errorMessage}`);
      await ctx.reply("Sorry, I failed to process the voice message.", {
        reply_to_message_id: ctx.message?.message_id,
      } as any);
    }
  });
}
