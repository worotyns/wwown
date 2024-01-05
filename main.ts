import { load } from "dotenv";
import { createApiApplication } from "./application/api/api_application.ts";
import { ProcessManager } from "./application/process_manager.ts";
import { createLogger } from "./application/logger.ts";
import { createFs } from "@worotyns/atoms";
import { WhoWorksOnWhatNow } from "./domain/wwown.ts";
import {
  createSlackService,
  SlackEnvVars,
} from "./application/services/slack.ts";

interface HttpApiEnvVars {
  API_SERVER_BIND_ADDR: string;
  API_SERVER_PORT: string;
}

interface WwownEnvVars {
  ATOMS_PATH: string;
}

interface EnvVars extends SlackEnvVars, HttpApiEnvVars, WwownEnvVars {
  [key: string]: string;
}

const env: EnvVars = await load({ export: true }) as EnvVars;
const entrypoint: string = env.ATOMS_ENTRYPOINT || "wwown_prod";

const { persist, restore } = createFs(env.ATOMS_PATH);
const logger = createLogger();

let wwown: WhoWorksOnWhatNow;

try {
  wwown = await restore(entrypoint, WhoWorksOnWhatNow);
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    wwown = WhoWorksOnWhatNow.createWithIdentity(entrypoint);
    console.log("File not found, start fresh instance: " + entrypoint);
  } else {
    logger.error(error);
    Deno.exit(1);
  }
}
const app = createApiApplication(wwown);
const slack = createSlackService(wwown, env, logger);

setInterval(async () => {
  await persist(wwown);
}, 600_000); // Every 5 minutes persist data

const abortController = new AbortController();

const slackPromise = slack.start();

const serverPromise = app.listen({
  hostname: env.API_SERVER_BIND_ADDR || "127.0.0.1",
  port: ~~env.API_SERVER_PORT || 8000,
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
