import { Application, send } from "oak";
import { WhoWorksOnWhatNow } from "../../domain/wwown.ts";
import { createRouter } from "./router.ts";

export function createApiApplication(wwown: WhoWorksOnWhatNow, healthCallback: () => [string, boolean]): Application {
  const app = new Application();
  const router = createRouter(wwown, healthCallback);
  const ROOT_DIR = "./frontend";

  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(async (ctx, next) => {
    if (ctx.request.url.pathname.startsWith("/api")) {
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

  return app;
}
