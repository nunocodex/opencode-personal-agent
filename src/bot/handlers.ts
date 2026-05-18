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
import { messages } from "./messages";

export async function startHandler(ctx: Context): Promise<void> {
  await ctx.reply(messages.start, { parse_mode: "MarkdownV2" });
}

export async function helpHandler(ctx: Context): Promise<void> {
  await ctx.reply(messages.help, { parse_mode: "MarkdownV2" });
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
    await ctx.reply(messages.newSession, { parse_mode: "MarkdownV2" });
  };
}

export function statusHandler() {
  return async (ctx: Context): Promise<void> => {
    const userId = ctx.from!.id;
    if (hasSession(userId)) {
      await ctx.reply(messages.sessionActive(sessionCount()), {
        parse_mode: "MarkdownV2",
      });
    } else {
      await ctx.reply(messages.noSession, { parse_mode: "MarkdownV2" });
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
      await ctx.reply(messages.opencodeError, { parse_mode: "MarkdownV2" });
    }
  };
}
