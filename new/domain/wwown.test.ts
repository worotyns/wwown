import { createMemory } from "@worotyns/atoms";
import { WhoWorksOnWhatNow } from "./wwown.ts";
import { assertEquals } from "@testing/asserts";
import { createWwown } from "./testing_helpers.ts";
import { UserViewDto } from "../application/api/dtos/user_dto.ts";

Deno.test("wwown test", async () => {
  const { persist, restore } = createMemory();

  const wwown = createWwown();
  
  const users = wwown.getUserData("user1");

  console.log(
    new UserViewDto(
      users,
      {
        from: new Date("2023-01-01"),
        to: new Date("2023-01-02"),
        lastItems: 10,
      },
    ),
  );

  await persist(wwown);
  
  const restored = await restore(wwown.identity, WhoWorksOnWhatNow);

  assertEquals(restored, wwown);
});
