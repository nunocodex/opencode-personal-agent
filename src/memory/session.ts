const sessions = new Map<number, string>();

export function getSession(userId: number): string | undefined {
  return sessions.get(userId);
}

export function setSession(userId: number, sessionId: string): void {
  sessions.set(userId, sessionId);
}

export function deleteSession(userId: number): boolean {
  return sessions.delete(userId);
}

export function hasSession(userId: number): boolean {
  return sessions.has(userId);
}

export function sessionCount(): number {
  return sessions.size;
}
