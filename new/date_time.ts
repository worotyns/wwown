/**
 * Always returns the current day.
 * Reset hours, minutes, seconds, and milliseconds to 0.
 */
export function Day(date: Date = new Date()) {
  return new Date(DayRaw(date) + "T00:00:00.000Z");
}

export function DayRaw(date: Date = new Date()) {
  return date.toISOString().split("T")[0];
}

/**
 * Returns hours of UTC time.
 */
export function Hour(date: Date = new Date()) {
  return date.toISOString().split("T")[1].split(":")[0].padStart(2, "0");
}
