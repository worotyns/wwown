import { DateWithoutTimeRaw } from "./interfaces.ts";

/**
 * Always returns the current day.
 * Reset hours, minutes, seconds, and milliseconds to 0.
 */
export function Day(date: Date = new Date()) {
  return new Date(DayRaw(date) + "T00:00:00.000Z");
}

/**
 * Day as string for keying.
 */
export function DayRaw(date: Date = new Date()) {
  return date.toISOString().split("T")[0];
}

/**
 * Returns hours of UTC time.
 */
export function Hour(date: Date = new Date()) {
  return date.toISOString().split("T")[1].split(":")[0].padStart(2, "0");
}

/**
 * Wraps Slack ts date to Date object.
 */
export function SlackDate(ts: string) {
  return new Date(Number(ts) * 1000);
}

/**
 * Generates an array of days between start and end with raw string representation of YYYY-MM-DD.
 */
export function generateDayRawRange(
  start: Date,
  end: Date,
): Array<DateWithoutTimeRaw> {
  const range: DateWithoutTimeRaw[] = [];
  const current = new Date(start);

  while (current <= end) {
    range.push(DayRaw(current));
    current.setDate(current.getDate() + 1);
  }

  return range;
}
