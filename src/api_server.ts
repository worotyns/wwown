import { ActivityService } from "./activity_service";
import Fastify, { FastifyInstance } from 'fastify'
import { TimeTrackingService } from "./time_tracking_service";
import { ResourcesService } from "./resources_service";
const path = require('path')

interface ApiOptions {
    port: string;
    bindAddres: string;
}

export class ApiServer {

    private fastify: FastifyInstance

    constructor(
        private readonly resourcesService: ResourcesService,
        private readonly activityService: ActivityService,
        private readonly timeTrackingService: TimeTrackingService,
        private readonly opts: ApiOptions = { port: process.env.API_SERVER_PORT || '4000', bindAddres: process.env.API_SERVER_BIND_ADDR || '0.0.0.0'},
    ) {
        this.fastify = Fastify({logger: true})
        this.bindRouter();
    }

    bindRouter() {
        this.fastify.register(require('@fastify/static'), {
            root: path.join(__dirname, 'front'),
        })
        
        this.fastify.get('/ping', async (request, reply) => {
            return { pong: 'pong' }
        })

        this.fastify.get('/resources', async (request, reply) => {
            return await this.resourcesService.getResources();
        })

        /**
         * Returns top 5 user of each channel ordered by points, activity date
         */
        this.fastify.get('/activity/dashboard/top', async (request, reply) => {
            const query: any = request.query;
            return await this.activityService.getTopNUsersOfAllChannels(query.limit || 5);
        })

        /**
         * TimeTracking
         */

        /**
         * Returns last active users in all channels (who work on what now)
         */
        this.fastify.get('/timetracking/dashboard/last', async (request, reply) => {
            const query: any = request.query;
            return await this.timeTrackingService.durationPerChannelAndUserAndDescriptionInTimeRange(
                new Date(query.start || TimeTrackingService.startOfDay(new Date())),
                new Date(query.end || Date.now())
            );
        })

        /**
         * Activity
         */

        /**
         * Returns last active users in all channels (who work on what now)
         */
        this.fastify.get('/activity/dashboard/last', async (request, reply) => {
            return await this.activityService.getLastActivityOfAllInLastNHours();
        })

        /**
         * Returns channel today top users
         */
        this.fastify.get('/activity/channels/:channelid/today', async (request, reply) => {
            const params: any = request.params;
            return await this.activityService.getTodayChannelUsers(params.channelid || "none");
        })

        /**
         * Returns channel last users (last interest)
         */
        this.fastify.get('/activity/channels/:channelid/last', async (request, reply) => {
            const params: any = request.params;
            const query: any = request.query;
            return await this.activityService.getLastChannelUsers(params.channelid || "none", query.limit || 10);
        })

        /**
         * Returns top users of channel (knowledge master)
         */
        this.fastify.get('/activity/channels/:channelid/top', async (request, reply) => {
            const params: any = request.params;
            const query: any = request.query;

            return await this.activityService.getTopChannelUsers(params.channelid || "none", query.limit || 10);
        })

        /**
         * Get top of user channel interests
         */
        this.fastify.get('/activity/users/:userid/top', async (request, reply) => {
            const query: any = request.query;
            const params: any = request.params;
            return await this.activityService.getTopChannelsForUser(params.userid || "none", query.limit || 5);
        })

        /**
         * Get last channels of user interest
         */
        this.fastify.get('/activity/users/:userid/last', async (request, reply) => {
            const query: any = request.query;
            const params: any = request.params;
            return await this.activityService.getLastChannelsForUser(params.userid || "none", query.limit || 5);
        })

        /**
         * Get list of channels what user was active today
         */
        this.fastify.get('/activity/users/:userid/today', async (request, reply) => {
            const params: any = request.params;
            return await this.activityService.getTodayChannelsForUser(params.userid || "none");
        })

    }

    run() {
        const start = async () => {
            try {
              await this.fastify.listen({ port: ~~this.opts.port, host: this.opts.bindAddres })
            } catch (err) {
              this.fastify.log.error(err)
              process.exit(1)
            }
          }
          
        start()
    }

    stop() {
        return this.fastify.close()
    }

}