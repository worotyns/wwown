import { createMemory } from "@worotyns/atoms";
import { WhoWorksOnWhatNow } from "./wwown.ts";
import { assertEquals } from "@testing/asserts";
import {
  ExtendedResourceStats,
  HourPercentDistribution,
} from "../application/interfaces.ts";
import { CalculationHelpers } from "./calculator_helpers.ts";
import { createWwown } from "./testing_helpers.ts";

Deno.test("wwown test", async () => {
  const { persist, restore } = createMemory();

  const wwown = createWwown();

  // const channels = wwown.getChannelDataForRange(
  //   "channel2",
  //   new Date("2023-01-01"),
  //   new Date("2023-01-02"),
  // );

  // class ChannelViewDTO {
  //   // public activity: [];
  //   public hourlyInteractionsDistribution: HourPercentDistribution[];

  //   constructor(
  //     extendedStats: ExtendedResourceStats,
  //   ) {
  //     this.hourlyInteractionsDistribution = CalculationHelpers
  //       .calculateInteractionsDistribution(extendedStats);
  //   }
  // }

  // console.log(new ChannelViewDTO(channels));



  class UserViewDTO {
    // public activity: [];
    public hourlyInteractionsDistribution: HourPercentDistribution[];

    constructor(
      extendedStats: ExtendedResourceStats,
    ) {
      this.hourlyInteractionsDistribution = CalculationHelpers
        .calculateInteractionsDistribution(extendedStats);
    }
  }
  const users = wwown.getUserDataForRange(
    "user1",
    new Date("2023-01-01"),
    new Date("2023-01-02"),
  );
  
  console.log(new UserViewDTO(users));

  await persist(wwown);
  const restored = await restore(wwown.identity, WhoWorksOnWhatNow);
  assertEquals(restored, wwown);
});
