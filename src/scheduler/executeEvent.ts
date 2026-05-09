import type { ScheduledEvent } from "./types.js";

export interface ExecuteContext {
  sendMessage: (chatId: string, text: string) => Promise<void>;
}

export async function executeEvent(event: ScheduledEvent, ctx: ExecuteContext): Promise<void> {
  console.log(`[executeEvent] sending scheduled message to ${event.chatId}: ${event.what}`);
  await ctx.sendMessage(event.chatId, event.what);
}
