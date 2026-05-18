import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

export interface SessionEntry {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

export class SessionStore {
  private filePath: string;
  private sessions: Map<string, SessionEntry>;

  constructor(filePath?: string) {
    this.filePath = resolve(filePath ?? process.env.SESSION_STORE_PATH ?? "./data/sessions.json");
    this.sessions = new Map();
    this.load();
  }

  private load(): void {
    if (!existsSync(this.filePath)) {
      return;
    }
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const data = JSON.parse(raw) as Record<string, SessionEntry>;
      for (const [key, value] of Object.entries(data)) {
        this.sessions.set(key, value);
      }
    } catch {
      // ignore corrupt file
    }
  }

  private save(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const obj: Record<string, SessionEntry> = {};
    for (const [key, value] of this.sessions) {
      obj[key] = value;
    }
    writeFileSync(this.filePath, JSON.stringify(obj, null, 2));
  }

  get(chatId: string): SessionEntry | undefined {
    return this.sessions.get(chatId);
  }

  set(chatId: string, sessionId: string): void {
    const now = new Date().toISOString();
    const existing = this.sessions.get(chatId);
    this.sessions.set(chatId, {
      sessionId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    this.save();
  }

  delete(chatId: string): void {
    this.sessions.delete(chatId);
    this.save();
  }

  list(): { chatId: string; entry: SessionEntry }[] {
    const result: { chatId: string; entry: SessionEntry }[] = [];
    for (const [chatId, entry] of this.sessions) {
      result.push({ chatId, entry });
    }
    return result;
  }
}
