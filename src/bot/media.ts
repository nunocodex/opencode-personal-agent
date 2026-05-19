import type { Context } from "grammy";
import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import type { Config } from "../config";
import { createSession, sendMediaMessage, deleteSessionById, sendMessage } from "../opencode/client";
import { getSession, setSession } from "../memory/session";
import { transcribeOgg } from "../voice/transcriber";
import { sendReply } from "./utils";
import { messages, PARSE_MODE } from "./messages";

export function photoHandler(
  config: Config,
  client: OpencodeClient
) {
  return async (ctx: Context): Promise<void> => {
    if (!ctx.message?.photo) return;

    await ctx.api.sendChatAction(ctx.chat!.id, "typing");

    const largest = ctx.message.photo[ctx.message.photo.length - 1];

    try {
      const file = await ctx.api.getFile(largest.file_id);
      if (!file.file_path) {
        await ctx.reply("Errore: impossibile scaricare il file.");
        return;
      }

      const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const dataUri = await fileUrlToDataUri(fileUrl);
      const caption = ctx.message.caption ?? "Describe this image";
      const mime = dataUri.slice(5, dataUri.indexOf(";"));

      const [mediaProvider, mediaModel] = config.MEDIA_MODEL.split("/");
      const session = await createSession(client, "Media");
      const { data, error: promptError } = await client.session.prompt({
        sessionID: session.id,
        model: { providerID: mediaProvider, modelID: mediaModel },
        system: "You are a vision model. Analyze the image directly.",
        parts: [
          { type: "text", text: caption },
          { type: "file", mime, filename: "media", url: dataUri },
        ],
      });
      if (promptError) {
        await ctx.reply("Errore AI nell'analisi dell'immagine.");
        return;
      }

      const response = data?.parts
        ? (() => {
            const parts = data.parts as any[];
            const textParts = parts.filter(p => p.type === "text" && p.text).map(p => p.text);
            if (textParts.length > 0) return textParts.join("\n");
            const reasoningParts = parts.filter(p => p.type === "reasoning" && p.text).map(p => p.text);
            return reasoningParts.join("\n");
          })()
        : "";

      await deleteSessionById(client, session.id).catch(() => {});
      await sendReply(ctx, response);
    } catch (error) {
      console.error("[photo] ERROR:", error);
      await ctx.reply(messages.mediaError, { parse_mode: PARSE_MODE });
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
        parse_mode: PARSE_MODE,
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
      await ctx.reply(messages.mediaError, { parse_mode: PARSE_MODE });
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
      // Step 1: Download voice file
      const file = await ctx.api.getFile(ctx.message.voice.file_id);
      if (!file.file_path) {
        await ctx.reply("Errore nel download del messaggio vocale.");
        return;
      }

      const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const oggBuffer = new Uint8Array(await response.arrayBuffer());
      console.log("[voice] downloaded, size:", oggBuffer.length);

      // Step 2: Transcribe
      const transcription = await transcribeOgg(oggBuffer);
      console.log("[voice] transcription:", transcription);

      // Step 3: Confirm transcription to user
      await ctx.reply(`🎤 *Trascrizione:* ${transcription}`, {
        parse_mode: PARSE_MODE,
      });

      // Step 4: Send transcription to user's session
      const userId = ctx.from!.id;
      let sessionId = getSession(userId);
      if (!sessionId) {
        const session = await createSession(client);
        sessionId = session.id;
        setSession(userId, sessionId);
      }

      await ctx.api.sendChatAction(ctx.chat!.id, "typing");
      const aiResponse = await sendMessage(client, sessionId, transcription);
      await sendReply(ctx, aiResponse);
    } catch (error) {
      console.error("Voice handler error:", error);
      await ctx.reply("Errore nell'elaborazione del messaggio vocale.");
    }
  };
}

const MIME_FROM_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
};

function guessMime(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  return MIME_FROM_EXT[ext] ?? "application/octet-stream";
}

async function fileUrlToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mime = guessMime(url);
  console.log("[dataUri] guessed mime:", mime);
  return `data:${mime};base64,${base64}`;
}
