import { assertEquals } from "@testing/asserts";
import { createMemory } from "@worotyns/atoms";
import { DayAggregate } from "./day_aggregate.ts";

Deno.test("DayAggregate test", async () => {
  const { persist, restore } = createMemory();

  const dayAggregate = new DayAggregate();

  dayAggregate.registerMessage("sample", "samplech");

  console.log(dayAggregate);

  await persist(dayAggregate);
  const restored = await restore(dayAggregate.identity, DayAggregate);

  assertEquals(restored, dayAggregate);
});
