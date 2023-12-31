import { createMemory } from "@worotyns/atoms";
import { WhoWorksOnWhatNow } from "./wwown.ts";
import { assertEquals } from "@testing/asserts";
import {
  Activity,
  HourPercentDistribution,
  LastChannels,
  TopChannels,
} from "../application/interfaces.ts";
import { CalculationHelpers } from "./calculator_helpers.ts";
import { createWwown } from "./testing_helpers.ts";
import { ConcreteResourceData, ConcreteResourceDataParams } from "./stats/concrete_resource_data.ts";

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
  //     extendedStats: ConcreteResourceData,
  //   ) {
  //     this.hourlyInteractionsDistribution = CalculationHelpers
  //       .calculateInteractionsDistribution(extendedStats);
  //   }
  // }

  // console.log(new ChannelViewDTO(channels));

  /**
   * Collected user information for user page
   * Calculated from all time data and range data
   * Some calculations are limited to n-parameters like top-n last-n
   */
  class UserViewDTO {
    /**
     * All time activity
     */
    public activityAllTime: Activity[];

    /**
     * Distribution hourly interactions in range
     */
    public hourlyInRange: HourPercentDistribution[];

    /**
     * Distribution hourly interactions all-time range
     */
    public hourlyAllTime: HourPercentDistribution[];

    /**
     * Last channels interfactions sorted and limited to N items in range time
     */
    public lastChannelsInRange: LastChannels[];

    /**
     * Top channels interactions sorted and limited to N items in all time
     */
    public topChannelsAllTime: TopChannels[];

    constructor(
      extendedStats: ConcreteResourceData,
      // A moze tutaj dorzucic parametry pobierania? np. lastItems: number, czy activityRange i dataRange - rozdziclic
      // Extended stats mozna zrobic class i dac jej metody z range - to by bylo najsensowniejsze ;D
      params: ConcreteResourceDataParams,
    ) {
      this.activityAllTime = CalculationHelpers.getActivity(extendedStats);

      this.hourlyAllTime = CalculationHelpers
        .getHourlyInteractionsDistributionAllTime(extendedStats);

      this.hourlyInRange = CalculationHelpers
        .getHourlyInteractionsDistributionInRange(extendedStats, params);

      this.lastChannelsInRange = CalculationHelpers.getLastAllTimeNChannels(
        extendedStats,
        params,
      );

      this.topChannelsAllTime = CalculationHelpers.getTopAllTimeNChannels(
        extendedStats,
        params,
      );
    }
  }

  const users = wwown.getUserData(
    "user1",
  );

  console.log(
    new UserViewDTO(
      users,
      {
        from: new Date("2023-01-01"),
        to: new Date("2023-01-02"),
        lastItems: 10,
      },
    ),
  );

  await persist(wwown);
  const restored = await restore(wwown.identity, WhoWorksOnWhatNow);
  assertEquals(restored, wwown);
});
