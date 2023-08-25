import assert from "assert";
import { StatsCollector } from "./stats_collector";
import { createFakeLogger } from "./logger";

describe("stats_collector", function () {
  it("collects and aggregate", async function () {
    let collectedState: any;

    const dummyCollector = new StatsCollector(
      new Map([
        ["resource", [
          (val) => val.toString(),
          (val) => val,
        ]],
        ["label", [
          (val) => val.toString(),
          (val) => val,
        ]],
      ]),
      async (state) => {
        collectedState = state;
      },
      createFakeLogger()
    );

    for (let i = 0; i < 10; i++) {
      dummyCollector.register({
        resource: "123",
        label: "one_two_three",
      });

      dummyCollector.register({
        resource: "321",
        label: "three_two_one",
      });
    }

    assert.deepEqual(dummyCollector.getState(), [
      {
        label: "one_two_three",
        resource: "123",
        value: 10,
      },
      {
        label: "three_two_one",
        resource: "321",
        value: 10,
      },
    ]);

    await dummyCollector.dumpAndClean();

    assert.deepEqual(dummyCollector.getState(), []);
    assert.deepEqual(collectedState, [
      {
        label: "one_two_three",
        resource: "123",
        value: 10,
      },
      {
        label: "three_two_one",
        resource: "321",
        value: 10,
      },
    ]);
  });
});
