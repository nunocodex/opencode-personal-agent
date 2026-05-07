import { Context } from "telegraf";
import { existsSync } from "fs";

const MAX_LENGTH = 4096;

export async function sendReply(
  ctx: Context,
  text: string,
  replyToMessageId?: number
): Promise<void> {
  const fileRegex = /\[SEND_FILE:([^\]]+)\]/g;
  const files: string[] = [];
  let cleanText = text.replace(fileRegex, (match, path) => {
    files.push(path.trim());
    return "";
  });

  cleanText = cleanText.trim();

  const baseOpts: any = { parse_mode: "Markdown" };
  if (replyToMessageId !== undefined) {
    baseOpts.reply_to_message_id = replyToMessageId;
  }

  if (cleanText) {
    for (let i = 0; i < cleanText.length; i += MAX_LENGTH) {
      const chunk = cleanText.slice(i, i + MAX_LENGTH);
      try {
        await ctx.reply(chunk, baseOpts);
      } catch {
        const fallbackOpts: any = {};
        if (replyToMessageId !== undefined) {
          fallbackOpts.reply_to_message_id = replyToMessageId;
        }
        await ctx.reply(chunk, fallbackOpts);
      }
    }
  }

  for (const filePath of files) {
    try {
      const fileOpts: any = {};
      if (replyToMessageId !== undefined) {
        fileOpts.reply_to_message_id = replyToMessageId;
      }
      if (existsSync(filePath)) {
        await ctx.replyWithDocument({ source: filePath }, fileOpts);
      } else {
        await ctx.reply(`[File not found: ${filePath}]`, fileOpts);
      }
    } catch {
      const errOpts: any = {};
      if (replyToMessageId !== undefined) {
        errOpts.reply_to_message_id = replyToMessageId;
      }
      await ctx.reply(`[Failed to send file: ${filePath}]`, errOpts);
    }
  }
}
