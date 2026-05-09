import { EventScheduler } from "../../scheduler/EventScheduler.js";
import { parseSchedule } from "../../scheduler/ScheduleParser.js";
import { parseScheduleBlocks } from "./parseScheduleBlocks.js";

export interface ProcessResult {
  cleanText: string;
  scheduledCount: number;
  cancelledCount: number;
  errors: string[];
}

export function processScheduleBlocks(
  chatId: string,
  text: string,
  scheduler: EventScheduler
): ProcessResult {
  const { cleanText, schedules, cancels } = parseScheduleBlocks(text);
  const errors: string[] = [];
  let scheduledCount = 0;
  let cancelledCount = 0;

  for (const schedule of schedules) {
    const dueAt = parseSchedule(schedule.when);
    if (dueAt) {
      scheduler.schedule(chatId, dueAt, schedule.what);
      scheduledCount++;
    } else {
      errors.push(`Could not parse schedule time: "${schedule.when}"`);
    }
  }

  for (const cancel of cancels) {
    const removed = scheduler.cancel(chatId, cancel.what);
    if (removed) {
      cancelledCount++;
    } else {
      errors.push(`Could not find event to cancel: "${cancel.what}"`);
    }
  }

  return { cleanText, scheduledCount, cancelledCount, errors };
}
