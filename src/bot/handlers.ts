import type { Context } from "grammy";
import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import type { Config } from "../config";
import {
  createSession,
  sendMessage,
  deleteSessionById,
} from "../opencode/client";
import {
  getSession,
  setSession,
  deleteSession,
  hasSession,
  sessionCount,
} from "../memory/session";
import { sendReply } from "./utils";

export async function startHandler(ctx: Context): Promise<void> {
  await ctx.reply(
    "Benvenuto\\! Sono il tuo assistente AI personale\\.\n\n" +
    "Inviami un messaggio e ti risponderò\\.\n" +
    "Uso memoria e web search quando serve\\.\n\n" +
    "*/help* \\- Lista comandi\n" +
    "*/new* \\- Nuova conversazione\n" +
    "*/status* \\- Stato sessione",
    { parse_mode: "MarkdownV2" }
  );
}

export async function helpHandler(ctx: Context): Promise<void> {
  await ctx.reply(
    "*/start* \\- Messaggio di benvenuto\n" +
    "*/help* \\- Questo messaggio\n" +
    "*/new* \\- Cancella la conversazione e inizia una nuova sessione\n" +
    "*/status* \\- Info sulla sessione corrente\n\n" +
    "Puoi inviarmi:\n" +
    "\\- Testo: rispondo con AI\n" +
    "\\- Foto: analizzo con modello vision\n" +
    "\\- PDF: analizzo il contenuto\n" +
    "\\- Voce: trascrivo e rispondo",
    { parse_mode: "MarkdownV2" }
  );
}

export function newSessionHandler(
  config: Config,
  client: OpencodeClient
) {
  return async (ctx: Context): Promise<void> => {
    const userId = ctx.from!.id;
    const existingId = getSession(userId);
    if (existingId) {
      await deleteSessionById(client, existingId).catch(() => {});
      deleteSession(userId);
    }
    await ctx.reply("Conversazione cancellata\\. Il prossimo messaggio creerà una nuova sessione\\.", {
      parse_mode: "MarkdownV2",
    });
  };
}

export function statusHandler() {
  return async (ctx: Context): Promise<void> => {
    const userId = ctx.from!.id;
    if (hasSession(userId)) {
      await ctx.reply(
        `Sessione attiva\\. Sessioni totali: ${sessionCount()}`,
        { parse_mode: "MarkdownV2" }
      );
    } else {
      await ctx.reply("Nessuna sessione attiva\\.", {
        parse_mode: "MarkdownV2",
      });
    }
  };
}

export function textHandler(
  config: Config,
  client: OpencodeClient
) {
  return async (ctx: Context): Promise<void> => {
    const userId = ctx.from!.id;
    const text = ctx.message!.text!;

    await ctx.api.sendChatAction(ctx.chat!.id, "typing");

    try {
      let sessionId = getSession(userId);
      if (!sessionId) {
        const session = await createSession(client);
        sessionId = session.id;
        setSession(userId, sessionId);
      }

      const response = await sendMessage(client, sessionId, text);
      await sendReply(ctx, response);
    } catch (error) {
      console.error("Text handler error:", error);
      await ctx.reply("Errore nella comunicazione con l'assistente\\.", {
        parse_mode: "MarkdownV2",
      });
    }
  };
}
