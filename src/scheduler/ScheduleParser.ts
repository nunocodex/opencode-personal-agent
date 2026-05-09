export function parseSchedule(input: string): Date | null {
  const trimmed = input.trim().toLowerCase();

  // "in 5 minutes"
  const inMatch = trimmed.match(
    /^in\s+(\d+)\s*(minute|minutes|min|mins|hour|hours|hr|hrs|day|days)\s*$/
  );
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    const now = new Date();
    if (unit.startsWith("minute") || unit.startsWith("min")) {
      return new Date(now.getTime() + amount * 60 * 1000);
    } else if (unit.startsWith("hour") || unit.startsWith("hr")) {
      return new Date(now.getTime() + amount * 60 * 60 * 1000);
    } else if (unit.startsWith("day")) {
      return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
    }
  }

  // "at 2026-05-10 14:30" or "at 2026-05-10T14:30:00"
  const atMatch = trimmed.match(/^at\s+(.+)$/);
  if (atMatch) {
    const dateStr = atMatch[1].trim();
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // "tomorrow at 9am"
  const tomorrowMatch = trimmed.match(/^tomorrow\s+at\s+(.+)$/);
  if (tomorrowMatch) {
    const timeStr = tomorrowMatch[1].trim();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const combined = new Date(`${tomorrow.toISOString().split("T")[0]} ${timeStr}`);
    if (!isNaN(combined.getTime())) {
      return combined;
    }
  }

  // Try plain ISO/date string
  const plain = new Date(trimmed);
  if (!isNaN(plain.getTime())) {
    return plain;
  }

  return null;
}
