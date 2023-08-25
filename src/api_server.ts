import { ActivityService } from "./activity_service";
import Fastify, { FastifyInstance } from "fastify";
import { TimeTrackingService } from "./time_tracking_service";
import { ResourcesService } from "./resources_service";
import path from "path";

interface ApiOptions {
  port: string;
  bindAddres: string;
}

export class ApiServer {
  static parseQueryTParam(range: string): [Date, Date] | null {
    if (!range) {
      return null;
    }
    
    const now = new Date();
    const periods = range.split(",");
  
    const parsedDates = periods.map(period => {
      const regex = /(-?\d+)([dhmqy])/;
      const match = period.match(regex);
  
      if (!match) {
        return null;
      }
  
      const value = parseInt(match[1]);
      const unit = match[2];
      let durationInMilliseconds = 0;
  
      switch (unit) {
        case "d":
          durationInMilliseconds = value * 24 * 60 * 60 * 1000;
          break;
        case "h":
          durationInMilliseconds = value * 60 * 60 * 1000;
          break;
        case "m":
          durationInMilliseconds = value * 60 * 1000;
          break;
        case "q":
          durationInMilliseconds = value * 3 * 30 * 24 * 60 * 60 * 1000; // Assuming 3 months per quarter
          break;
        case "y":
          durationInMilliseconds = value * 365 * 24 * 60 * 60 * 1000; // Approximating with 365 days per year
          break;
      }
  
      return new Date(now.getTime() + durationInMilliseconds);
    });
  
    if (parsedDates.some(date => date === null)) {
      return null;
    }
  
    return parsedDates as [Date, Date];
  }

  private fastify: FastifyInstance;

  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly activityService: ActivityService,
    private readonly timeTrackingService: TimeTrackingService,
    private readonly opts: ApiOptions = {
      port: process.env.API_SERVER_PORT || "4000",
      bindAddres: process.env.API_SERVER_BIND_ADDR || "0.0.0.0",
    },
  ) {
    this.fastify = Fastify({ logger: true });
    this.bindRouter();
  }

  private getParam(params: any, name: string) {
    const param = params[name];

    if (!param) {
      throw new Error(`${name} - query param in url is required`);
    }

    return param;
  }

  private parseT(query: any) {
    const range = ApiServer.parseQueryTParam(query?.t);

    if (!range) {
      throw new Error("?t param is required");
    }

    return range;
  }

  private parseLimit(query: any) {
    const limit = query?.l;

    if (!limit) {
      throw new Error("?l param is required");
    }

    return limit;
  }

  bindRouter() {
    this.fastify.register(require("@fastify/static"), {
      root: path.join(__dirname, "front"),
    });

    this.fastify.get("/ping", async (request) => {
      return { pong: "pong" };
    });

    this.fastify.get("/resources", async (request) => {
      return await this.resourcesService.getResources();
    });

    /**
     * Returns last active users in all channels (who work on what now)
     * dashboard.html
     */
    this.fastify.get("/timetracking/dashboard/last", async (request) => {
      const [startDate, endDate] = this.parseT(request.query);
      console.log(startDate.getTime(), endDate.getTime())
      return await this.timeTrackingService
        .durationPerChannelAndUserAndDescriptionInTimeRange(
          startDate,
          endDate,
        );
    });

    /**
     * Returns last active users in all channels (who work on what now)
     * dashboard.html
     */
    this.fastify.get("/activity/dashboard/last", async (request) => {
      const [startDate] = this.parseT(request.query);
      return await this.activityService.getLastActivityOfAllSinceDate(
        startDate,
      );
    });

    /**
     * Returns channel time range top users
     * channels.html
     */
    this.fastify.get(
      "/activity/channels/:channelid/range",
      async (request) => {
        const [startDate, endDate] = this.parseT(request.query);

        return await this.activityService.getChannelUsersInTimeRange(
          this.getParam(request.params, "channelid"),
          startDate,
          endDate,
        );
      },
    );

    /**
     * Returns channel last users (last interest)
     * channels.html
     */
    this.fastify.get(
      "/activity/channels/:channelid/last",
      async (request) => {
        return await this.activityService.getLastChannelUsers(
          this.getParam(request.params, "channelid"),
          this.parseLimit(request.query),
        );
      },
    );

    /**
     * Returns top users of channel (knowledge master)
     * channels.html   
     */
    this.fastify.get(
      "/activity/channels/:channelid/top",
      async (request) => {
        return await this.activityService.getTopChannelUsers(
          this.getParam(request.params, "channelid"),
          this.parseLimit(request.query),
        );
      },
    );

    /**
     * Get top of user channel interests
     * users.html
     */
    this.fastify.get("/activity/users/:userid/top", async (request) => {
      const query: any = request.query;
      return await this.activityService.getTopChannelsForUser(
        this.getParam(request.params, "userid"),
        this.parseLimit(request.query),
      );
    });

    /**
     * Get last channels of user interest
     * users.html
     */
    this.fastify.get("/activity/users/:userid/last", async (request) => {
      const query: any = request.query;
      return await this.activityService.getLastChannelsForUser(
        this.getParam(request.params, "userid"),
        this.parseLimit(request.query),
      );
    });
    
    /**
     * Returns last n- time registrations for user
     * users.html
     */
    this.fastify.get(
      "/timetracking/users/:userid/last",
      async (request) => {
        return await this.timeTrackingService
          .getLastNChannelAndDescriptionOfUser(
            this.getParam(request.params, "userid"),
            this.parseLimit(request.query),
          );
      },
    );

  }

  run() {
    const start = async () => {
      try {
        await this.fastify.listen({
          port: ~~this.opts.port,
          host: this.opts.bindAddres,
        });
      } catch (err) {
        this.fastify.log.error(err);
        process.exit(1);
      }
    };

    start();
  }

  stop() {
    return this.fastify.close();
  }
}
