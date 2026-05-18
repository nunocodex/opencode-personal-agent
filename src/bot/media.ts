import type { Context } from "grammy";
import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import type { Config } from "../config";
import { createSession, sendMediaMessage, deleteSessionById } from "../opencode/client";
import { sendReply } from "./utils";

export function photoHandler(
  config: Config,
  client: OpencodeClient
) {
  return async (ctx: Context): Promise<void> => {
    if (!ctx.message?.photo) return;

    await ctx.api.sendChatAction(ctx.chat!.id, "typing");

    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1];

    try {
      const file = await ctx.api.getFile(largest.file_id);
      const filePath = file.file_path!;
      const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${filePath}`;
      const dataUri = await fileUrlToDataUri(fileUrl);

      const caption = ctx.message.caption ?? "Describe this image";

      const session = await createSession(client, "Media");
      const response = await sendMediaMessage(
        client,
        session.id,
        caption,
        dataUri,
        "image/jpeg",
        config.MEDIA_MODEL
      );
      await deleteSessionById(client, session.id).catch(() => {});

      await sendReply(ctx, response);
    } catch (error) {
      console.error("Photo handler error:", error);
      await ctx.reply("Errore nell'analisi dell'immagine\\.", {
        parse_mode: "MarkdownV2",
      });
    }
  };
}

export function documentHandler(
  config: Config,
  client: OpencodeClient
) {
  return async (ctx: Context): Promise<void> => {
    if (!ctx.message?.document) return;

    const doc = ctx.message.document;
    const allowedMimes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ];

    if (!doc.mime_type || !allowedMimes.includes(doc.mime_type)) {
      await ctx.reply(
        "Formato non supportato\\. Supporto: PDF, immagini, testo\\.",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    await ctx.api.sendChatAction(ctx.chat!.id, "typing");

    try {
      const file = await ctx.api.getFile(doc.file_id);
      const filePath = file.file_path!;
      const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${filePath}`;
      const dataUri = await fileUrlToDataUri(fileUrl);

      const caption = ctx.message.caption ?? `Analyze this document: ${doc.file_name ?? "file"}`;

      const session = await createSession(client, "Media");
      const response = await sendMediaMessage(
        client,
        session.id,
        caption,
        dataUri,
        doc.mime_type,
        config.MEDIA_MODEL
      );
      await deleteSessionById(client, session.id).catch(() => {});

      await sendReply(ctx, response);
    } catch (error) {
      console.error("Document handler error:", error);
      await ctx.reply("Errore nell'analisi del documento\\.", {
        parse_mode: "MarkdownV2",
      });
    }
  };
}

export function voiceHandler(
  config: Config,
  client: OpencodeClient
) {
  return async (ctx: Context): Promise<void> => {
    if (!ctx.message?.voice) return;

    await ctx.api.sendChatAction(ctx.chat!.id, "typing");

    try {
      await ctx.reply("Trascrizione voce non ancora implementata\\.", {
        parse_mode: "MarkdownV2",
      });
    } catch (error) {
      console.error("Voice handler error:", error);
    }
  };
}

async function fileUrlToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mime = response.headers.get("content-type") ?? "application/octet-stream";
  return `data:${mime};base64,${base64}`;
}
