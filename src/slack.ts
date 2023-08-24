import { App } from '@slack/bolt';
import { StatsCollector } from './stats_collector';
import { DayChannel, Mapping } from './stats_collector_factory';
import { SlackHelper } from './slack_helper';

export class BotFactory {
  constructor(
    private readonly statsCollector: StatsCollector<DayChannel>,
    private readonly mappingCollector: StatsCollector<Mapping>,
  ) {

  }

  create(): [App, SlackHelper] {
    const app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      socketMode: true,
      appToken: process.env.SLACK_APP_TOKEN,
      port: ~~(process.env.PORT || 3000)
    });

    const slackHelper = new SlackHelper(app, this.mappingCollector);

    app.event('reaction_added', async ({event, say}) => {
      this.statsCollector.register({
        channel: event.item.channel,
        user: event.user,
        day: slackHelper.resolveDateFromTS(event.event_ts),
        type: 'reaction_added'
      });

      await slackHelper.touchMappings(event.item.channel, event.user);
    })

    app.event('channel_created', async ({event, say}) => {
      this.statsCollector.register({
        channel: event.channel.id,
        user: event.channel.creator,
        day: slackHelper.resolveDateFromTS(event.channel.created.toString()),
        type: 'channel_created'
      });

      await slackHelper.touchMappings(event.channel.id, event.channel.creator);

      await app.client.conversations.join({
        channel: event.channel.id,
      });
    })

    app.message(/.*/, async ({ message, say }) => {
      const user = (message as any).user;

      this.statsCollector.register({
        channel: message.channel,
        user: user,
        day: slackHelper.resolveDateFromTS(message.event_ts),
        type: 'message'
      });

      await slackHelper.touchMappings(message.channel, user);
    });

    return [app, slackHelper];
  }
}