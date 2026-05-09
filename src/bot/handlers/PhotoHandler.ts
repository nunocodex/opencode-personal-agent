import { Context } from "telegraf";
import { message } from "telegraf/filters";
import { createWriteStream } from "fs";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { SessionStore } from "../SessionStore.js";
import { createSession, sendMessage } from "../../opencode/Client.js";
import { sendReply } from "../utils/sendReply.js";
import { botConfig } from "../../config/bot.config.js";
import { processScheduleBlocks } from "../utils/processScheduleBlocks.js";
import type { EventScheduler } from "../../scheduler/EventScheduler.js";

export function registerPhotoHandler(bot: any, store: SessionStore, scheduler?: EventScheduler): void {
  bot.on(message("photo"), async (ctx: Context) => {
    const chatId = ctx.chat?.id.toString();
    const photos = (ctx.message as any)?.photo;
    if (!chatId || !photos || photos.length === 0) return;

    const largest = photos[photos.length - 1];
    const fileName = `photo_${(ctx.message as any)?.message_id}.jpg`;
    const caption = (ctx.message as any)?.caption ?? "";

    console.log(`[bot] received photo from chat ${chatId}: ${fileName}`);

    await ctx.sendChatAction("typing");
    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {});
    }, 4000);

    try {
      const fileLink = await ctx.telegram.getFileLink(largest.file_id);
      const uploadsDir = resolve(botConfig.opencodeProjectDir, "workspace", "uploads");
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }
      const localPath = resolve(uploadsDir, fileName);

      const res = await fetch(fileLink.href);
      if (!res.ok) {
        throw new Error(`Failed to download photo: ${res.status}`);
      }
      const body = res.body;
      if (!body) {
        throw new Error("No response body");
      }
      await pipeline(Readable.fromWeb(body as any), createWriteStream(localPath));
      console.log(`[bot] photo downloaded: ${localPath}`);

      const unixPath = localPath.replace(/\\/g, "/");
      let prompt: string;
      if (caption) {
        prompt = `User: ${caption}\n\nLook at the image at ${unixPath} and act on the user's request.`;
      } else {
        prompt = `User sent an image: ${fileName}\n\nLook at the image at ${unixPath} and describe what you see.`;
      }

      let sessionEntry = store.get(chatId);
      if (!sessionEntry) {
        const sessionId = await createSession("OpenCode Agents chat", botConfig.opencodeProjectDir);
        store.set(chatId, sessionId);
        sessionEntry = store.get(chatId)!;
      }

      const response = await sendMessage(sessionEntry.sessionId, prompt);
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
      console.error(`[bot] error processing photo from chat ${chatId}: ${errorMessage}`);
      await ctx.reply("Sorry, I failed to process the photo.", {
        reply_to_message_id: ctx.message?.message_id,
      } as any);
    }
  });
}
