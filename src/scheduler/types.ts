export interface ScheduledEvent {
  id: string;
  chatId: string;
  what: string;
  dueAt: Date;
  createdAt: Date;
}

export interface EventsData {
  events: Array<{
    id: string;
    chatId: string;
    what: string;
    dueAt: string;
    createdAt: string;
  }>;
}
