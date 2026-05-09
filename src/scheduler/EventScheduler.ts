import { EventStore } from "./EventStore.js";
import type { ScheduledEvent } from "./types.js";
import { randomUUID } from "crypto";

export interface EventSchedulerOptions {
  checkIntervalMs?: number;
  eventsFilePath?: string;
  onExecute: (event: ScheduledEvent) => Promise<void>;
}

export class EventScheduler {
  private options: Required<Pick<EventSchedulerOptions, "checkIntervalMs">> & {
    eventsFilePath?: string;
    onExecute: (event: ScheduledEvent) => Promise<void>;
  };
  private store: EventStore;
  private events: ScheduledEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(options: EventSchedulerOptions) {
    this.options = {
      checkIntervalMs: 60_000,
      ...options,
    };
    this.store = new EventStore(options.eventsFilePath);
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    // Load existing events
    this.events = this.store.load();

    // Remove missed events (skip them, don't execute)
    const now = new Date();
    const missedCount = this.events.filter((e) => e.dueAt <= now).length;
    if (missedCount > 0) {
      console.log(`[scheduler] discarding ${missedCount} missed events`);
      this.events = this.events.filter((e) => e.dueAt > now);
      this.store.save(this.events);
    }

    this.timer = setInterval(() => this.check(), this.options.checkIntervalMs);
    console.log(`[scheduler] started with ${this.events.length} pending events`);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log("[scheduler] stopped");
  }

  private check(): void {
    const now = new Date();
    const due = this.events.filter((e) => e.dueAt <= now);
    if (due.length === 0) return;

    // Remove due events from the list
    this.events = this.events.filter((e) => e.dueAt > now);
    this.store.save(this.events);

    for (const event of due) {
      console.log(`[scheduler] executing event ${event.id} for chat ${event.chatId}`);
      this.options.onExecute(event).catch((err: unknown) => {
        console.error(`[scheduler] execution error for event ${event.id}:`, err);
      });
    }
  }

  schedule(chatId: string, dueAt: Date, what: string): string {
    const event: ScheduledEvent = {
      id: randomUUID(),
      chatId,
      what,
      dueAt,
      createdAt: new Date(),
    };
    this.events.push(event);
    this.events.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    this.store.save(this.events);
    console.log(`[scheduler] scheduled event ${event.id} for ${dueAt.toISOString()}`);
    return event.id;
  }

  cancel(chatId: string, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();
    const initialLength = this.events.length;
    this.events = this.events.filter((e) => {
      if (e.chatId !== chatId) return true;
      return e.what.trim().toLowerCase() !== normalizedQuery;
    });
    const removed = initialLength > this.events.length;
    if (removed) {
      this.store.save(this.events);
    }
    return removed;
  }

  list(chatId?: string): ScheduledEvent[] {
    const events = [...this.events];
    if (chatId) {
      return events.filter((e) => e.chatId === chatId);
    }
    return events;
  }
}
