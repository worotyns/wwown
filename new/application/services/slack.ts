import { SocketModeClient } from "slack";
import { WebClient } from "slack-web";
import { SlackHelper } from "./slack_helper.ts";
import { Logger } from "../logger.ts";
import { WhoWorksOnWhatNow } from "../../domain/wwown.ts";
import { SlackDate } from "../../domain/common/date_time.ts";

export interface SlackEnvVars {
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_APP_TOKEN: string;
}

export function createSlackService(wwown: WhoWorksOnWhatNow, env: SlackEnvVars, logger: Logger) {
  
  const slackWebClient = new WebClient(env.SLACK_APP_TOKEN);
  const socketModeClient = new SocketModeClient({ appToken: env.SLACK_APP_TOKEN });
  const slackHelper = new SlackHelper(slackWebClient, logger);

  // Attach listeners to events by type. See: https://api.slack.com/events/message
  socketModeClient.addEventListener("reaction_added", async ({ detail: { body, ack } }) => {
    ack()

    const event = body.event;

    wwown.register({
      type: "reaction",
      meta: {
        channelId: event.item.channel,
        count: 1,
        emoji: event.reaction,
        itemUserId: event.item_user,
        timestamp: SlackDate(event.event_ts),
        userId: event.user,
      },
    });

    const [channelName, userName] = await slackHelper.resolveNames(
      event.item.channel,
      event.user,
    );

    wwown.resources.register({
      type: "user",
      meta: {
        userId: event.user,
        userName: userName,
        action: "add",
        timestamp: new Date(),
      },
    });

    wwown.resources.register({
      type: "channel",
      meta: {
        channelId: event.item.channel,
        channelName: channelName,
        action: "add",
        timestamp: new Date(),
      },
    });
  })

  socketModeClient.addEventListener("message", async ({ detail: { body, ack } }) => {
    ack()
    const message = body.event;

    if (!message.user) {
      return;
    }

    if (message.thread_ts) {
      if (!message.parent_user_id) {
        logger.error("Cannot resolve parent user id for thread: " + message.thread_ts);
      }

      wwown.register({
        type: "thread",
        meta: {
          parentUserId: message.parent_user_id,
          threadId: message.thread_ts,
          channelId: message.channel,
          timestamp: SlackDate(message.ts),
          userId: message.user,
          count: 1,
        },
      });
    } else {
      wwown.register({
        type: "message",
        meta: {
          channelId: message.channel,
          timestamp: SlackDate(message.ts),
          userId: message.user,
          count: 1,
        },
      });
    }

    const [channelName, userName] = await slackHelper.resolveNames(
      message.channel,
      message.user,
    );

    wwown.resources.register({
      type: "user",
      meta: {
        userId: message.user,
        userName: userName,
        action: "add",
        timestamp: new Date(),
      },
    });

    wwown.resources.register({
      type: "channel",
      meta: {
        channelId: message.channel,
        channelName: channelName,
        action: "add",
        timestamp: new Date(),
      },
    });
  })

  socketModeClient.addEventListener("channel_archive", ({ detail: { body, ack } }) => {
    ack()
    const event = body.event;
    wwown.register({
      type: "channel",
      meta: {
        channelId: event.channel,
        channelName: "NA",
        action: "remove",
        timestamp: new Date(),
      },
    });
  });

  socketModeClient.addEventListener("channel_created", async ({ detail: { body, ack } }) => {
    ack()
    const event = body.event;
    const [channelName, userName] = await slackHelper.resolveNames(
      event.channel.id,
      event.channel.creator,
    );

    wwown.resources.register({
      type: "user",
      meta: {
        userId: event.channel.creator,
        userName: userName,
        action: "add",
        timestamp: new Date(),
      },
    });

    wwown.resources.register({
      type: "channel",
      meta: {
        channelId: event.channel.id,
        channelName: channelName,
        action: "add",
        timestamp: new Date(),
      },
    });

    await slackWebClient.conversations.join({
      channel: event.channel.id,
    });
  });

  socketModeClient.addEventListener("channel_deleted", ({ detail: { body, ack } }) => {
    ack()
    const event = body.event;
    wwown.register({
      type: "channel",
      meta: {
        channelId: event.channel,
        channelName: "NA",
        action: "remove",
        timestamp: new Date(),
      },
    });
  });

  socketModeClient.addEventListener("channel_rename", ({ detail: { body, ack } }) => {
    ack()
    const event = body.event;
    wwown.register({
      type: "channel",
      meta: {
        channelId: event.channel.id,
        channelName: event.channel.name_normalized,
        action: "add",
        timestamp: new Date(),
      },
    });
  });

  socketModeClient.addEventListener("channel_unarchive", ({ detail: { body, ack } }) => {
    ack()
    const event = body.event;
    wwown.register({
      type: "channel",
      meta: {
        channelId: event.channel.id,
        channelName: event.channel.name_normalized,
        action: "add",
        timestamp: new Date(),
      },
    });
  });

  return socketModeClient
}