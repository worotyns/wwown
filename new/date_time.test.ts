import { assertEquals } from "@testing/asserts";
import { Day, Hour } from "./date_time.ts";

Deno.test("DateTime Day test", () => {
  const day = Day(new Date(2021, 0, 1, 12, 33, 44, 555));
  assertEquals(day.toISOString(), "2021-01-01T00:00:00.000Z");
  assertEquals(day.toISOString(), "2021-01-01T00:00:00.000Z");
});

Deno.test("DateTime Hour test", () => {
  assertEquals(Hour(new Date(2021, 0, 1, 12, 33, 44, 555)), "11");
  assertEquals(Hour(new Date(2021, 0, 1, 3, 33, 44, 555)), "02");
  assertEquals(Hour(new Date(2021, 0, 1, 21, 33, 44, 555)), "20");
});
