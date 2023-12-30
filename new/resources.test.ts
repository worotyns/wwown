import { createMemory } from "@worotyns/atoms";
import { Resources } from "./resources.ts";
import { assertEquals } from "@testing/asserts";

Deno.test("Resources test", async () => {
  const { persist, restore } = createMemory();

  const resources = new Resources();
  resources.registerChannel("channel1", "Channel 1");
  resources.registerUser("user1", "User 1");

  await persist(resources);
  const restored = await restore(resources.identity, Resources);

  assertEquals(restored, resources);

  assertEquals(restored.getChannels(), [["channel1", "Channel 1"]]);
  assertEquals(restored.getUsers(), [["user1", "User 1"]]);

  assertEquals(restored.resolveChannelById("channel1"), "Channel 1");
  assertEquals(restored.resolveUserById("user1"), "User 1");

  assertEquals(restored.resolveChannelIdByName("Channel 1"), "channel1");
  assertEquals(restored.resolveUserIdByName("User 1"), "user1");
});
