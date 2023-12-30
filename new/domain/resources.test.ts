import { createMemory } from "@worotyns/atoms";
import { Resources } from "./resources.ts";
import { assertEquals } from "@testing/asserts";
import { ChannelEvent, UserEvent } from "./common/interfaces.ts";

Deno.test("Resources test", async () => {
  const { persist, restore } = createMemory();

  const resources = new Resources();

  const createChannelEvent: ChannelEvent = {
    type: "channel",
    meta: {
      action: "add",
      channelId: "channel1",
      channelName: "Channel 1",
      timestamp: new Date(),
    },
  };
  const createUserEvent: UserEvent = {
    type: "user",
    meta: {
      action: "add",
      userId: "user1",
      userName: "User 1",
      timestamp: new Date(),
    },
  };
  resources.register(createUserEvent);
  resources.register(createChannelEvent);

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
