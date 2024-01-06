import { Router } from "oak";
import { WhoWorksOnWhatNow } from "../../domain/wwown.ts";
import { UserViewDto } from "./dtos/user_dto.ts";
import { ChannelViewDto } from "./dtos/channel_dto.ts";
import { DashboardViewDto } from "./dtos/dashboard_dto.ts";

export function createRouter(
  wwown: WhoWorksOnWhatNow,
  healthCallback: () => [string, boolean],
): Router {
  const router = new Router();

  router.get("/ping", (context) => {
    context.response.body = "pong";
    context.response.status = 200;
  });

  router.get("/health", (context) => {
    const [msg, ok] = healthCallback();
    context.response.body = msg;
    context.response.status = ok ? 200 : 500;
  });

  router
    .get("/api/users/:userId", (context) => {
      const from = context.request.url.searchParams.get("from");
      const to = context.request.url.searchParams.get("to");
      const lastItems = context.request.url.searchParams.get("lastItems");

      if (!from || !to || !lastItems) {
        throw new Error("Missing query params: from, to or lastItems");
      }

      context.response.body = new UserViewDto(
        wwown.getUserData(context.params.userId),
        {
          from: new Date(from),
          to: new Date(to),
          lastItems: Number(lastItems),
        },
      );
    });

  router
    .get("/api/channels/:channelId", (context) => {
      const from = context.request.url.searchParams.get("from");
      const to = context.request.url.searchParams.get("to");
      const lastItems = context.request.url.searchParams.get("lastItems");

      if (!from || !to || !lastItems) {
        throw new Error("Missing query params: from, to or lastItems");
      }

      context.response.body = new ChannelViewDto(
        wwown.getChannelData(context.params.channelId),
        {
          from: new Date(from),
          to: new Date(to),
          lastItems: Number(lastItems),
        },
      );
    });

  router
    .get("/api/dashboard", (context) => {
      const from = context.request.url.searchParams.get("from");
      const to = context.request.url.searchParams.get("to");
      const lastItems = context.request.url.searchParams.get("lastItems");

      if (!from || !to || !lastItems) {
        throw new Error("Missing query params: from, to or lastItems");
      }

      context.response.body = new DashboardViewDto(
        wwown.getDashboardData(),
        {
          from: new Date(from),
          to: new Date(to),
          lastItems: Number(lastItems),
        },
      );
    });

  router
    .get("/api/resources", (context) => {
      context.response.body = wwown.resources.getAsResources();
    });

  return router;
}
