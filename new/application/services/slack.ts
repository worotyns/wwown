import bolt from "npm:@slack/bolt";
import { SlackHelper } from "./slack_helper.ts";
import { Logger } from "../logger.ts";
import { WhoWorksOnWhatNow } from "../../domain/wwown.ts";
import { SlackDate } from "../../domain/common/date_time.ts";

export function createSlackService(wwown: WhoWorksOnWhatNow, env: Record<string, string>, logger: Logger) {
  const app = new bolt.App({
    token: env.SLACK_BOT_TOKEN,
    signingSecret: env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: env.SLACK_APP_TOKEN,
    port: ~~(env.PORT || 3000),
  });

  const slackHelper = new SlackHelper(app, logger);

  app.event("reaction_added", async ({ event }) => {
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
  });

  app.event("channel_created", async ({ event }) => {
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

    await app.client.conversations.join({
      channel: event.channel.id,
    });
  });

  app.event("channel_rename", ({ event }) => {
    wwown.register({
      type: "channel",
      meta: {
        channelId: event.channel.id,
        channelName: event.channel.name_normalized,
        action: "add",
        timestamp: new Date(),
      },
    });
    return Promise.resolve();
  });

  app.event("channel_deleted", ({ event }) => {
    wwown.register({
      type: "channel",
      meta: {
        channelId: event.channel,
        channelName: "NA",
        action: "remove",
        timestamp: new Date(),
      },
    });
    return Promise.resolve();
  });

  app.event("channel_archive", ({ event }) => {
    wwown.register({
      type: "channel",
      meta: {
        channelId: event.channel,
        channelName: "NA",
        action: "remove",
        timestamp: new Date(),
      },
    });
    return Promise.resolve();
  });

  app.message(/.*/, async ({ message }) => {
    
    logger.info(message);

    const user = (message as any).user;
    const thread = (message as any).thread_ts;

    if (!user) {
      return;
    }

    if (thread) {
      const parentUserId = await slackHelper.resolveAuthorOfThreadByThreadTs(
        thread,
      );
      if (parentUserId) {
        logger.info({parentUserId, thread, message});
        wwown.register({
          type: "thread",
          meta: {
            parentUserId: parentUserId, // TODO via API get thread author
            threadId: thread,
            channelId: message.channel,
            timestamp: SlackDate(message.ts),
            userId: user,
            count: 1,
          },
        });
      } else {
        logger.error("Cannot resolve parent user id for thread: " + thread);
      }
    } else {
      wwown.register({
        type: "message",
        meta: {
          channelId: message.channel,
          timestamp: SlackDate(message.ts),
          userId: user,
          count: 1,
        },
      });
    }

    const [channelName, userName] = await slackHelper.resolveNames(
      message.channel,
      user,
    );

    wwown.resources.register({
      type: "user",
      meta: {
        userId: user,
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
  });

  return app;
}
