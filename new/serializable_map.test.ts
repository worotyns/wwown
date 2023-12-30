import { assertEquals } from "@testing/asserts";
import { SerializableMap } from "./serializable_map.ts";

Deno.test("SerializableMap test", () => {
  const temp = new SerializableMap();
  temp.set("a", 1);
  temp.set("b", 2);
  temp.set("c", 3);

  assertEquals(temp.toJSON(), [["a", 1], ["b", 2], ["c", 3]]);
  assertEquals(new SerializableMap(temp.toJSON()), temp);
});
