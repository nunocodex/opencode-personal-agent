import { Context } from "telegraf";
import { message } from "telegraf/filters";
import { createWriteStream } from "fs";
import { existsSync, mkdirSync } from "fs";
import { resolve, basename } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { SessionStore } from "../SessionStore.js";
import { createSession, sendMessage } from "../../opencode/Client.js";
import { sendReply } from "../utils/sendReply.js";
import { botConfig } from "../../config/bot.config.js";

function sanitizeFileName(name: string): string {
  let safe = name.replace(/[\/\\]/g, "_").replace(/\.{2,}/g, "_");
  safe = safe.replace(/[\x00-\x1f\x7f]/g, "");
  if (!safe.trim() || safe === "_") {
    safe = `file_${Date.now()}`;
  }
  return safe;
}

export function registerDocumentHandler(bot: any, store: SessionStore): void {
  bot.on(message("document"), async (ctx: Context) => {
    const chatId = ctx.chat?.id.toString();
    const doc = (ctx.message as any)?.document;
    if (!chatId || !doc) return;

    const rawFileName = doc.file_name ?? "document";
    const fileName = sanitizeFileName(rawFileName);
    const caption = (ctx.message as any)?.caption ?? "";

    console.log(`[bot] received document from chat ${chatId}: ${fileName}`);

    await ctx.sendChatAction("typing");
    const typingInterval = setInterval(() => {
      ctx.sendChatAction("typing").catch(() => {});
    }, 4000);

    try {
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const uploadsDir = resolve(botConfig.opencodeProjectDir, "workspace", "uploads");
      if (!existsSync(uploadsDir)) {
        mkdirSync(uploadsDir, { recursive: true });
      }
      const localPath = resolve(uploadsDir, fileName);

      const res = await fetch(fileLink.href);
      if (!res.ok) {
        throw new Error(`Failed to download file: ${res.status}`);
      }
      const body = res.body;
      if (!body) {
        throw new Error("No response body");
      }
      await pipeline(Readable.fromWeb(body as any), createWriteStream(localPath));
      console.log(`[bot] document downloaded: ${localPath}`);

      const unixPath = localPath.replace(/\\/g, "/");
      let prompt: string;
      if (caption) {
        prompt = `User: ${caption}\n\nRead the file at ${unixPath} and act on the user's request.`;
      } else {
        prompt = `User sent a file: ${fileName}\n\nRead the file at ${unixPath} and do what seems appropriate.`;
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
      console.error(`[bot] error processing document from chat ${chatId}: ${errorMessage}`);
      await ctx.reply("Sorry, I failed to process the document.", {
        reply_to_message_id: ctx.message?.message_id,
      } as any);
    }
  });
}
