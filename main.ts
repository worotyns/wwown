import { load } from "dotenv";
import { createApiApplication } from "./application/api/api_application.ts";
import { ProcessManager } from "./application/process_manager.ts";
import { createLogger } from "./application/logger.ts";
import { createFs } from "@worotyns/atoms";
import { WhoWorksOnWhatNow } from "./domain/wwown.ts";
import { createSlackService } from "./application/services/slack.ts";

const logger = createLogger();
await load({ export: true, allowEmptyValues: true });

const entrypoint: string = Deno.env.get("ATOMS_ENTRYPOINT") || "wwown_prod";
const path: string = Deno.env.get("ATOMS_PATH")!;

logger.info(`Entrypoint is: ${entrypoint}, path: ${path}`);

const { persist, restore } = createFs(path);

let wwown: WhoWorksOnWhatNow;

try {
  wwown = await restore(entrypoint, WhoWorksOnWhatNow);
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    wwown = WhoWorksOnWhatNow.createWithIdentity(entrypoint);
    logger.info("File not found, start fresh instance: " + entrypoint);
  } else {
    logger.error(error);
    Deno.exit(1);
  }
}

const slack = createSlackService(wwown, {
  SLACK_APP_TOKEN: Deno.env.get("SLACK_APP_TOKEN")!,
  SLACK_BOT_TOKEN: Deno.env.get("SLACK_BOT_TOKEN")!,
  SLACK_SIGNING_SECRET: Deno.env.get("SLACK_SIGNING_SECRET")!,
}, logger);

const app = createApiApplication(wwown, () => {
  return [slack.connected ? "OK" : "Slack not connected", slack.connected];
});

const persistInterval = ~~(Deno.env.get("ATOMS_PERSIST_INTERVAL") || "300_000");

setInterval(async () => {
  await persist(wwown);
}, persistInterval);

const abortController = new AbortController();

const slackPromise = slack.start();

const serverPromise = app.listen({
  hostname: Deno.env.get("API_SERVER_BIND_ADDR") || "0.0.0.0",
  port: ~~(Deno.env.get("API_SERVER_PORT") || "8000"),
  signal: abortController.signal,
});

ProcessManager.create(
  [
    async () => {
      logger.log("Stopping slack");
      slack.disconnect();
      await slackPromise;
    },
    async () => {
      logger.log("Stopping server");
      await serverPromise;
    },
    async () => {
      logger.log("Persisting data");
      await persist(wwown);
    },
  ],
  abortController,
  logger,
);
