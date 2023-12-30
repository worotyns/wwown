import { BasicStats } from "./basic_stats.ts";
import { assertEquals } from "https://deno.land/std@0.210.0/assert/assert_equals.ts";

Deno.test("BasicStats test", () => {
  const temp = new BasicStats();

  for (let i = 0; i < 10; i++) {
    temp.inc(i);
  }

  assertEquals(temp.avg, 5);
  assertEquals(temp.total, 45);
  assertEquals(temp.min, 0);
  assertEquals(temp.max, 9);
});
