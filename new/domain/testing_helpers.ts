import { generateDayRawRange } from "./common/date_time.ts";
import { WhoWorksOnWhatNow } from "./wwown.ts";

export function createWwown(): WhoWorksOnWhatNow {
  const wwown = new WhoWorksOnWhatNow();

  const channels = ["channel1", "channel2"];
  const users = ["user1", "user2", "user3", "user4"];
  const kinds = ["message"]; // , "reaction", "thread"
  const days = generateDayRawRange(
    new Date("2023-01-01"),
    new Date("2023-01-05"),
  );

  for (const day of days) {
    const now = new Date(`${day} 00:00:00`);

    for (const channel of channels) {
      for (const user of users) {
        now.setHours(now.getHours() + 1);
        wwown.register({
          // deno-lint-ignore no-explicit-any
          type: "reaction" as any,
          meta: {
            channelId: channel,
            userId: user,
            emoji: "smile",
            timestamp: now,
          },
        });
        for (const kind of kinds) {
          now.setSeconds(now.getSeconds() + 1);
          wwown.register({
            // deno-lint-ignore no-explicit-any
            type: kind as any,
            meta: {
              channelId: channel,
              userId: user,
              emoji: "smile",
              timestamp: now,
            },
          });
        }
      }
    }
  }

  return wwown;
}
