import { assertEquals } from "@testing/asserts";
import { CalculationHelpers } from "./calculator_helpers.ts";
import { createWwown } from "./testing_helpers.ts";
import { DayAggregate } from "./stats/day_aggregate.ts";
import { ResourceStats } from "./stats/resource_stats.ts";
import { ExtendedResourceStats } from "../application/interfaces.ts";

Deno.test("CalculatorHelpers calculateMinMaxOfHourlyInteractionsDistributionInRange test", () => {
  const wwown = createWwown();
  const extended = wwown.getChannelDataForRange(
    "channel1",
    new Date("2023-01-01"),
    new Date("2023-01-02"),
  );

  const extendedData = CalculationHelpers
    .calculateMinMaxAndSumOfHourlyInteractionsDistributionInRange(
      extended,
    );

  assertEquals(extendedData, [2, 2, 16]);
});

Deno.test("CalculatorHelpers calculateInteractionsDistribution test", () => {
  const dummy: ExtendedResourceStats = {
    allTime: new ResourceStats("channel1"),
    range: [
      new ResourceStats("channel1"),
    ],
    resource: "channel1",
  };

  [
    {
      type: "message",
      meta: {
        channelId: "channel1",
        userId: "user1",
        timestamp: new Date("2023-01-01T00:00:00.000Z"),
      },
    },
    {
      type: "message",
      meta: {
        channelId: "channel1",
        userId: "user1",
        timestamp: new Date("2023-01-01T00:00:00.000Z"),
      },
    },
    {
      type: "message",
      meta: {
        channelId: "channel1",
        userId: "user1",
        timestamp: new Date("2023-01-01T00:00:00.000Z"),
      },
    },
    {
      type: "message",
      meta: {
        channelId: "channel1",
        userId: "user1",
        timestamp: new Date("2023-01-01T00:00:00.000Z"),
      },
    },
    {
      type: "message",
      meta: {
        channelId: "channel1",
        userId: "user1",
        timestamp: new Date("2023-01-01T01:00:00.000Z"),
      },
    },
  ].forEach((item) => dummy.range[0].register(item as any));

  const extendedData = CalculationHelpers.calculateInteractionsDistribution(
    dummy,
  );

  assertEquals(extendedData, [["00", 0.8], ["01", 0.2]]);
});
