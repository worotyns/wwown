import {
  DateWithoutTimeRaw,
  LastTouchSerialized,
  Percent,
  SlackChannelId,
  Total,
  TwoDigitHour,
} from "../domain/common/interfaces.ts";


type Interactions = number;
type ChannelsCount = number;
type UsersCount = number;
type IncidentsCount = number;

export type HourPercentDistribution = [TwoDigitHour, Percent];
export type LastChannels = [SlackChannelId, Total, LastTouchSerialized];
export type TopChannels = [SlackChannelId, Total, LastTouchSerialized];
export type Activity = [
  DateWithoutTimeRaw,
  Interactions,
  UsersCount,
  ChannelsCount,
  IncidentsCount,
];
