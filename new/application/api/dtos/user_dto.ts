import { CalculationHelpers } from "../../../domain/calculator_helpers.ts";
import { Max, Min, SlackChannelId, SlackChannelName, SlackUserId, SlackUserName } from "../../../domain/common/interfaces.ts";
import { Resources } from "../../../domain/resources.ts";
import {
  ConcreteResourceData,
  ConcreteResourceDataParams,
} from "../../../domain/stats/concrete_resource_data.ts";
import {
  Activity,
  HourPercentDistribution,
  LastChannels,
  TopChannels,
} from "../../interfaces.ts";

/**
 * Collected user information for user page
 * Calculated from all time data and range data
 * Some calculations are limited to n-parameters like top-n last-n
 */
export class UserViewDto {
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
  public lastChannelsInRangeMinMax: [Min, Max, Min, Max];

  /**
   * Top channels interactions sorted and limited to N items in all time
   */
  public topChannelsAllTime: TopChannels[];
  public topChannelsAllTimeMinMax: [Min, Max, Min, Max];

  public resources: Array<[SlackChannelId | SlackUserId, SlackChannelName | SlackUserName]>;

  constructor(
    extendedStats: ConcreteResourceData,
    // A moze tutaj dorzucic parametry pobierania? np. lastItems: number, czy activityRange i dataRange - rozdziclic
    // Extended stats mozna zrobic class i dac jej metody z range - to by bylo najsensowniejsze ;D
    params: ConcreteResourceDataParams,
    resources: Resources,
  ) {

    this.resources = [
      ...resources.getChannels(),
      ...resources.getUsers(),
    ]

    this.activityAllTime = CalculationHelpers.getActivity(
      extendedStats,
    );

    this.hourlyAllTime = CalculationHelpers
      .getHourlyInteractionsDistributionAllTime(extendedStats);

    this.hourlyInRange = CalculationHelpers
      .getHourlyInteractionsDistributionInRange(extendedStats, params);
      
    this.lastChannelsInRangeMinMax = CalculationHelpers.calculateMinMaxInteractionsInRangeChannels(
      extendedStats,
      params,
    );

    this.lastChannelsInRange = CalculationHelpers.getLastAllTimeNChannels(
      extendedStats,
      params
    );

    this.topChannelsAllTime = CalculationHelpers.getTopAllTimeNChannels(
      extendedStats,
      params,
    );

    this.topChannelsAllTimeMinMax = CalculationHelpers.calculateMinMaxInteractionsInAllChannels(
      extendedStats
    );
  }
}
