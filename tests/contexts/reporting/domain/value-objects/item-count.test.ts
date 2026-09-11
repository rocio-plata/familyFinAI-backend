import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ItemCount } from "../../../../../src/contexts/reporting/domain/value-objects/item-count.js";

describe("ItemCount", () => {
  it("comienza en cero", () => {
    assert.equal(ItemCount.zero().value, 0);
  });

  it("incrementa y decrementa el conteo", () => {
    const count = ItemCount.zero().increment().increment().decrement();

    assert.equal(count.value, 1);
  });

  it("rechaza un conteo negativo", () => {
    assert.throws(() => ItemCount.zero().decrement(), {
      name: "InvalidItemCountError",
    });
  });
});
