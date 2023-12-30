export type SlackChannelId = string;
export type SlackThreadId = string;
export type SlackUserId = string;

export type SlackUserName = string;
export type SlackChannelName = string;

export type FirstActivityAt = Date;
export type LastActivityAt = Date;

export type LastTouch = Date;

export type DateWithoutTime = Date;
export type DateWithoutTimeRaw = string;

export type TwoDigitHour = string;
export type Emoji = string;

export type SlackInteractionKind =
  | "thread"
  | "message"
  | "reaction"
  | "channel"
  | "user";

interface Event<T> {
  type: SlackInteractionKind;
  meta: T;
}

export type Events =
  | UserEvent
  | MessageEvent
  | ThreadMessageEvent
  | ChannelEvent
  | ReactionMessageEvent;

export type InteractionEvents =
  | MessageEvent
  | ThreadMessageEvent
  | ReactionMessageEvent;
export type ResourceEvents = UserEvent | ChannelEvent;

export type ResourceAction = "add" | "remove";

export interface UserEvent {
  type: "user";
  meta: {
    action: ResourceAction;
    userId: SlackUserId;
    userName: SlackUserName;
    timestamp: Date;
  };
}

export interface ChannelEvent {
  type: "channel";
  meta: {
    action: ResourceAction;
    channelId: SlackChannelId;
    channelName: SlackChannelName;
    timestamp: Date;
  };
}

export interface MessageEvent {
  type: "message";
  meta: {
    channelId: SlackChannelId;
    userId: SlackUserId;
    timestamp: Date;
  };
}

export interface ThreadMessageEvent {
  type: "thread";
  meta: {
    channelId: SlackChannelId;
    userId: SlackUserId;
    threadId: SlackThreadId;
    parentUserId: SlackUserId;
    timestamp: Date;
  };
}

export interface ReactionMessageEvent {
  type: "reaction";
  meta: {
    channelId: SlackChannelId;
    userId: SlackUserId;
    itemUserId: null | SlackUserId;
    emoji: Emoji;
    timestamp: Date;
  };
}

export type Min = number;
export type Max = number;

export type Total = number;
export type Percent = number;