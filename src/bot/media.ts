import type { Context } from "grammy";
import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import type { Config } from "../config";
import { createSession, sendMediaMessage, deleteSessionById } from "../opencode/client";
import { sendReply } from "./utils";
import { messages } from "./messages";

export function photoHandler(
  config: Config,
  client: OpencodeClient
) {
  return async (ctx: Context): Promise<void> => {
    if (!ctx.message?.photo) {
      console.log("[photo] no photo in message");
      return;
    }
    console.log("[photo] received, size:", ctx.message.photo.length);

    await ctx.api.sendChatAction(ctx.chat!.id, "typing");

    const largest = ctx.message.photo[ctx.message.photo.length - 1];
    console.log("[photo] largest file_id:", largest.file_id.slice(0, 10) + "...");

    try {
      const file = await ctx.api.getFile(largest.file_id);
      if (!file.file_path) {
        console.error("[photo] no file_path from getFile");
        await ctx.reply("Errore: impossibile scaricare il file.");
        return;
      }
      console.log("[photo] file_path:", file.file_path);

      const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const dataUri = await fileUrlToDataUri(fileUrl);
      console.log("[photo] dataUri length:", dataUri.length);

      const caption = ctx.message.caption ?? "Describe this image";
      console.log("[photo] caption:", caption);
      console.log("[photo] creating session...");

      const session = await createSession(client, "Media");
      console.log("[photo] session created:", session.id);

      console.log("[photo] sending to opencode...");
      const { data, error: promptError } = await client.session.prompt({
        sessionID: session.id,
        model: { providerID: "opencode-go", modelID: "qwen3.5-plus" },
        parts: [
          { type: "text", text: caption },
          { type: "file", mime: "image/jpeg", filename: "media", url: dataUri },
        ],
      });
      if (promptError) {
        console.error("[photo] opencode error:", JSON.stringify(promptError));
        await ctx.reply("Errore AI: " + (promptError as any).message);
        return;
      }
      console.log("[photo] raw data keys:", Object.keys(data || {}));
      console.log("[photo] info:", JSON.stringify(data?.info).slice(0, 500));
      console.log("[photo] raw parts:", JSON.stringify(data?.parts).slice(0, 500));

      const response = data?.parts
        ? (data.parts as any[])
            .map((p: any) => (p.type === "text" ? p.text : ""))
            .filter(Boolean)
            .join("\n")
        : "";

      console.log("[photo] response received, length:", response.length);
      
      await deleteSessionById(client, session.id).catch(() => {});

      await sendReply(ctx, response);
    } catch (error) {
      console.error("[photo] ERROR:", error);
      await ctx.reply(messages.mediaError, { parse_mode: "MarkdownV2" });
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
      await ctx.reply(messages.unsupportedFormat, {
        parse_mode: "MarkdownV2",
      });
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
      await ctx.reply(messages.mediaError, { parse_mode: "MarkdownV2" });
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
      await ctx.reply(messages.voiceNotImplemented, {
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
