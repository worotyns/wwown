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

const { restore } = createFs('./data');
const router = new Router();
const wwown = await restore('wwown_prod', WhoWorksOnWhatNow)

router
  .get("/user/:userId", (context) => {
    context.response.body = new UserViewDto(
        wwown.getUserData('U01D70X18QL'),
        {from: new Date('2023-12-01'), to: new Date('2023-12-10'), lastItems: 10}
    );
  })

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });