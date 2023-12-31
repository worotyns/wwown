// TODO:
// - api - proste API zrobic, mozna nawet podejsc tak, zeby zwracac: resources, top, zakres dni - wtedy nie trzeba bedzie robic osobnego endpointa na wszystko?
// - okresowy dump
// - service calculator
// - migration old data?
// - process manager - zostawic i przetestowac - (mozna dac jako libka na deno tez jako osobny projekt) bo sie przyda atoms-util

// Run Bot
// Create object
// Run API
// Register Process Manager
// Periodic Dumps

import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { UserViewDto } from "./application/api/dtos/user_dto.ts";
import { WhoWorksOnWhatNow } from "./domain/wwown.ts";
import { createFs } from "@worotyns/atoms";
import { send } from "https://deno.land/x/oak@v12.6.1/send.ts";

const { restore } = createFs("./data");

const router = new Router();

console.log("Restoring data...", new Date());
const wwown = await restore("wwown_prod", WhoWorksOnWhatNow);
console.log("Data restored", new Date());
router
  .get("/users/:userId", (context) => {
    context.response.body = new UserViewDto(
      wwown.getUserData("U01D70X18QL"),
      {
        from: new Date("2023-12-01"),
        to: new Date("2023-12-05"),
        lastItems: 10,
      },
    );
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
