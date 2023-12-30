import { assertEquals } from "@testing/asserts";
import { SerializableSet } from "./serializable_set.ts";

Deno.test("SerializableSet test", () => {
  const temp = new SerializableSet();
  temp.add("a");
  temp.add("b");
  temp.add("c");

  assertEquals(temp.toJSON(), ["a", "b", "c"]);
  assertEquals(new SerializableSet(temp.toJSON()), temp);
});
