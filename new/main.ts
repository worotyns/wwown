// TODO:
// - okresowy dump
// - process manager - zostawic i przetestowac - (mozna dac jako libka na deno tez jako osobny projekt) bo sie przyda atoms-util

// Run Bot
// Create object
// Run API
// Register Process Manager
// Periodic Dumps

import { migratedResource } from "./migrate.ts";
import { createApiApplication } from "./application/api/api_application.ts";
import { ProcessManager } from "./application/process_manager.ts";
import { createLogger } from "./application/logger.ts";
import { createFs } from "@worotyns/atoms";
import { WhoWorksOnWhatNow } from "./domain/wwown.ts";

const { persist, restore } = createFs("./data");

const logger = createLogger();

let wwown: WhoWorksOnWhatNow;

try {
  wwown = await restore("wwown_prod", WhoWorksOnWhatNow);
} catch(error) {
  if (error instanceof Deno.errors.NotFound) {
    // wwown = new WhoWorksOnWhatNow();
    wwown = migratedResource;
    console.log('File not found, start fresh instance');
  } else {
    logger.error(error);
    Deno.exit(1);  
  }
}
const app = createApiApplication(wwown);

setInterval(async () => {
  await persist(wwown);
}, 600_000); // Every 5 minutes persist data

const abortController = new AbortController();

const serverPromise = app.listen({
  port: 8000,
  signal: abortController.signal,
});

ProcessManager.create(
  [
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
