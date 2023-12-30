export type SlackChannelId = string;
export type SlackThreadId = string;
export type SlackUserId = string;

export type SlackUserName = string;
export type SlackChannelName = string;

export type FirstActivityAt = Date;
export type lastActivityAt = Date;

export type LastTouch = Date;

export type DateWithoutTime = Date;
export type DateWithoutTimeRaw = string;

export type TwoDigitHour = string;

enum SlackInteractionKind {
  // Aggregators
  thread = "thread", // Need this?
  message = "message",
  reaction = "reaction",
  // Resources
  channel = "channel",
  user = "user",
}

interface Event<T> {
  type: SlackInteractionKind;
  meta: T;
}

export type Events = UserEvent | MessageEvent | ThreadMessageEvent;

interface UserEvent {
  type: SlackInteractionKind.user;
  meta: {
    userId: SlackUserId;
    userName: SlackUserName;
    timestamp: Date;
  };
}

interface ChannelEvent {
  type: SlackInteractionKind.channel;
  meta: {
    channelId: SlackChannelId;
    channelName: SlackChannelName;
    timestamp: Date;
  };
}

interface MessageEvent {
  type: SlackInteractionKind.message;
  meta: {
    channelId: SlackChannelId;
    userId: SlackUserId;
    timestamp: Date;
  };
}

interface ThreadMessageEvent {
  type: SlackInteractionKind.message;
  meta: {
    channelId: SlackChannelId;
    userId: SlackUserId;
    threadId: SlackThreadId;
    timestamp: Date;
  };
}

interface ThreadMessageEvent {
  type: SlackInteractionKind.message;
  meta: {
    channelId: SlackChannelId;
    userId: SlackUserId;
    threadId: SlackThreadId;
    timestamp: Date;
  };
}
