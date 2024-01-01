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
type Color = string;

export type HourPercentDistribution = [TwoDigitHour, Percent];
export type LastChannels = [SlackChannelId, Total, LastTouchSerialized];
export type TopChannels = [SlackChannelId, Total, LastTouchSerialized];

export type Activity = [
  DateWithoutTimeRaw,
  Color,
  Interactions,
  UsersCount,
  ChannelsCount,
  IncidentsCount,
];

export type Received = number;
export type Given = number;
