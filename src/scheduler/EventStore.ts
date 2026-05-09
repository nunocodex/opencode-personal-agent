import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { dirname, resolve } from "path";
import type { ScheduledEvent, EventsData } from "./types.js";

export class EventStore {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = resolve(filePath ?? process.env.SCHEDULER_EVENTS_FILE_PATH ?? "./data/events.json");
  }

  load(): ScheduledEvent[] {
    if (!existsSync(this.filePath)) {
      return [];
    }
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const data = JSON.parse(raw) as EventsData;
      if (!Array.isArray(data.events)) return [];
      return data.events.map((e) => ({
        id: e.id,
        chatId: e.chatId,
        what: e.what,
        dueAt: new Date(e.dueAt),
        createdAt: new Date(e.createdAt),
      }));
    } catch {
      return [];
    }
  }

  save(events: ScheduledEvent[]): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const data: EventsData = {
      events: events.map((e) => ({
        id: e.id,
        chatId: e.chatId,
        what: e.what,
        dueAt: e.dueAt.toISOString(),
        createdAt: e.createdAt.toISOString(),
      })),
    };
    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(data, null, 2));
    renameSync(tempPath, this.filePath);
  }
}
