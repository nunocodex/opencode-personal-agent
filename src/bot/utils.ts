import type { Context } from "grammy";

const MAX_MESSAGE_LENGTH = 4096;

export function splitMessage(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > MAX_MESSAGE_LENGTH) {
    let splitAt = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
    if (splitAt <= 0) splitAt = remaining.lastIndexOf(" ", MAX_MESSAGE_LENGTH);
    if (splitAt <= 0) splitAt = MAX_MESSAGE_LENGTH;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

export function isJsonResponse(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

export async function sendReply(
  ctx: Context,
  text: string
): Promise<void> {
  if (isJsonResponse(text)) {
    await ctx.reply("```json\n" + text + "\n```", { parse_mode: "MarkdownV2" });
    return;
  }

  const chunks = splitMessage(text);
  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }
}

export function checkAuth(
  ctx: Context,
  allowedUserId: number
): boolean {
  return ctx.from?.id === allowedUserId;
}
