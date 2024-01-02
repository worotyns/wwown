// TODO:
// - okresowy dump
// - process manager - zostawic i przetestowac - (mozna dac jako libka na deno tez jako osobny projekt) bo sie przyda atoms-util

// Run Bot
// Create object
// Run API
// Register Process Manager
// Periodic Dumps

import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { UserViewDto } from "./application/api/dtos/user_dto.ts";
import { createFs } from "@worotyns/atoms";
import { send } from "https://deno.land/x/oak@v12.6.1/send.ts";
import { migratedResource } from "./migrate.ts";
import { ChannelViewDto } from "./application/api/dtos/channel_dto.ts";
import { DashboardViewDto } from "./application/api/dtos/dashboard_dto.ts";
import { WhoWorksOnWhatNow } from "./domain/wwown.ts";

const { restore, persist } = createFs("./data");

const router = new Router();

console.log("Starting... ", new Date());
// const wwown = await restore("wwown_prod", WhoWorksOnWhatNow);
const wwown = migratedResource;
// await persist(wwown);

router
  .get("/users/:userId", (context) => {
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
  .get("/channels/:channelId", (context) => {
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
  .get("/dashboard", (context) => {
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
.get("/resources", (context) => {
  context.response.body = wwown.resources.getAsResources();
});

const app = new Application();

const ROOT_DIR = "./app";

app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname.startsWith("/api")) {
    ctx.response.status = 404;
    ctx.response.body = "Not found";
    return next();
  }

  if (ctx.request.url.pathname.split("/").filter((i) => i).length > 1) {
    ctx.response.status = 404;
    ctx.response.body = "Not found - cannot get static file of directory";
    return next();
  }

  const filePath = ctx.request.url.pathname.replace("/", "");
  await send(ctx, filePath || "index.html", {
    root: ROOT_DIR,
    extensions: ["html", "js", "css", "json"],
  });
});
await app.listen({ port: 8000 });
