// TODO:
// - okresowy dump
// - process manager - zostawic i przetestowac - (mozna dac jako libka na deno tez jako osobny projekt) bo sie przyda atoms-util

// Run Bot
// Create object
// Run API
// Register Process Manager
// Periodic Dumps

// import { createFs } from "@worotyns/atoms";
import { migratedResource } from "./migrate.ts";
import { createApplication } from "./application/api/app_application.ts";

// const { restore, persist } = createFs("./data");

console.log("Starting... ", new Date());
// const wwown = await restore("wwown_prod", WhoWorksOnWhatNow);
const wwown = migratedResource;
// await persist(wwown);
const app = createApplication(wwown);
await app.listen({ port: 8000 });
