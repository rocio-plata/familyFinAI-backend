import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CategoryIcon } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-icon.js";

describe("CategoryIcon", () => {
  it("crea una instancia para una clave válida", () => {
    assert.doesNotThrow(() => CategoryIcon.of("shopping_cart"));
  });

  it("elimina espacios al inicio y final", () => {
    assert.equal(CategoryIcon.of("  shopping_cart  ").toString(), "shopping_cart");
  });

  it("lanza InvalidCategoryIconError para una clave vacía", () => {
    assert.throws(() => CategoryIcon.of(""), { name: "InvalidCategoryIconError" });
  });

  it("lanza InvalidCategoryIconError para una clave solo con espacios", () => {
    assert.throws(() => CategoryIcon.of("   "), { name: "InvalidCategoryIconError" });
  });

  it("lanza InvalidCategoryIconError para una clave mayor a 40 caracteres", () => {
    assert.throws(() => CategoryIcon.of("a".repeat(41)), { name: "InvalidCategoryIconError" });
  });

  it("acepta una clave de exactamente 40 caracteres", () => {
    assert.doesNotThrow(() => CategoryIcon.of("a".repeat(40)));
  });

  it("equals() compara las claves de forma exacta", () => {
    assert.ok(CategoryIcon.of("shopping_cart").equals(CategoryIcon.of("shopping_cart")));
    assert.ok(!CategoryIcon.of("shopping_cart").equals(CategoryIcon.of("Shopping_Cart")));
  });
});
