import { App } from '@slack/bolt';
import { StatsCollector } from './stats_collector';
import { DayChannel, Mapping } from './stats_collector_factory';
import { IntentionType, SlackHelper } from './slack_helper';
import { Logger } from './logger';
import { WebClient } from '@slack/web-api';
import { TimeTrackingService } from './time_tracking_service';
import { IncidentService } from './incident_service';

export class BotFactory {
  constructor(
    private readonly statsCollector: StatsCollector<DayChannel>,
    private readonly mappingCollector: StatsCollector<Mapping>,
    private readonly timeTrackingService: TimeTrackingService,
    private readonly incidentService: IncidentService,
    private readonly logger: Logger,
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

    const webClient = new WebClient(process.env.SLACK_BOT_TOKEN)

    const slackHelper = new SlackHelper(app, this.mappingCollector, this.logger, webClient);

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

    app.event('app_mention', async ({ event, context, client, say }) => {
      try {
        const withoutMention = slackHelper.removeAngleBracketText(event.text);
        const [incidentType, inputWithoutCommand] = slackHelper.detectIntentionOnTextBased(withoutMention);
        const {startTime, endTime, description} = TimeTrackingService.extractTimeAndDescription(inputWithoutCommand);

        switch(incidentType) {
          case IntentionType.NotRecognized:
            await say(`<@${event.user}>! Not recognized command, use for example prompt: "5h30m incident: outgage of rabbit" or "5h time: ticket xyz" `);
            break;
          case IntentionType.TimeTracking:
            await this.timeTrackingService.registerTimeTrackingItem(event.channel, event.user!, startTime, endTime, description);
            await slackHelper.addReaction(event.channel, event.ts, 'clock1')
            break;
          case IntentionType.Incident:
            await this.incidentService.registerIncidentItem(event.channel, event.user!, startTime, endTime, description);
            await slackHelper.addReaction(event.channel, event.ts, 'fire')
            break;
        }
      }
      catch (error: any) {
        await say(`<@${event.user}>! Error: ${error.message}`);
      }
    });

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