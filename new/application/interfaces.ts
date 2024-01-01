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
export type SummaryDescription = string;
export type UserSummaryLabel =
  | "reactionsReceived" // How many reactions are you receiving?
  | "reactionsGiven" // How many reactions are you giving?
  | "threadCount" // How many threads are you participating in?
  | "threadAuthoredCount" // How many threads are you authoring?
  | "threadContributedCount" // How many threads are you contributing to?
  | "threadMessages" // How many messages are you sending via threads?
  | "threadAvgMessages" // What is your average number of messages per thread?
  | "threadAvgMessagesAuthored" // What is your average number of messages authored per thread?
  | "threadAvgMessagesContributed" // What is your average number of messages contributed per thread?
  | "threadMaxMessages" // What is your maximum number of messages per thread?
  | "threadAuthoredMaxMessages" // What is your maximum number of messages per thread?
  | "threadContributedMaxMessages" // What is your maximum number of messages per thread?
  | "threadAvgMinutes" // What is your average thread duration?
  | "threadAuthoredAvgMinutes" // What is your average thread duration?
  | "threadContributedAvgMinutes" // What is your average thread duration?
  | "threadMaxMinutes" // What is your maximum thread duration?
  | "threadAuthoredMaxMinutes" // What is your maximum thread duration?
  | "threadContributedMaxMinutes" // What is your maximum thread duration?
  | "channelsCount" // How many channels are you participating in?
  | "msgsInThreads" // How many messages are you sending via threads?
  | "msgsInChannels" // How many messages are you sending via channels?
  | "msgsCount" // How many messages are you sending?
  | "totalActivityHours" // How many hours are you active?
  | "avgActivityHoursPerDay"; // What is your average number of hours active per day?
