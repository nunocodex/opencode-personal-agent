export interface ScheduleBlock {
  when: string;
  what: string;
}

export interface CancelBlock {
  what: string;
}

export interface ParseResult {
  cleanText: string;
  schedules: ScheduleBlock[];
  cancels: CancelBlock[];
}

export function parseScheduleBlocks(text: string): ParseResult {
  const schedules: ScheduleBlock[] = [];
  const cancels: CancelBlock[] = [];

  // Parse [SCHEDULE]...[/SCHEDULE]
  const scheduleRegex = /\[SCHEDULE\]\s*([\s\S]*?)\s*\[\/SCHEDULE\]/g;
  let cleanText = text.replace(scheduleRegex, (_match, content) => {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length >= 2) {
      const when = lines[0].trim();
      const what = lines.slice(1).join("\n").trim();
      schedules.push({ when, what });
    } else if (lines.length === 1) {
      schedules.push({ when: "unknown", what: lines[0].trim() });
    }
    return "";
  });

  // Parse [SCHEDULE_CANCEL]...[/SCHEDULE_CANCEL]
  const cancelRegex = /\[SCHEDULE_CANCEL\]\s*([\s\S]*?)\s*\[\/SCHEDULE_CANCEL\]/g;
  cleanText = cleanText.replace(cancelRegex, (_match, content) => {
    cancels.push({ what: content.trim() });
    return "";
  });

  cleanText = cleanText.trim();

  return { cleanText, schedules, cancels };
}
