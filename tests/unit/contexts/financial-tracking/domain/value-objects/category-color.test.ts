// tests/unit/contexts/financial-tracking/domain/value-objects/category-color.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CategoryColor } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-color.js";

describe("CategoryColor", () => {
  it("crea una instancia para una clave válida", () => {
    assert.doesNotThrow(() => CategoryColor.of("teal_500"));
  });

  it("elimina espacios al inicio y final", () => {
    assert.equal(CategoryColor.of("  teal_500  ").toString(), "teal_500");
  });

  it("lanza InvalidCategoryColorError para una clave vacía", () => {
    assert.throws(() => CategoryColor.of(""), { name: "InvalidCategoryColorError" });
  });

  it("lanza InvalidCategoryColorError para una clave solo con espacios", () => {
    assert.throws(() => CategoryColor.of("   "), { name: "InvalidCategoryColorError" });
  });

  it("lanza InvalidCategoryColorError para una clave mayor a 40 caracteres", () => {
    assert.throws(() => CategoryColor.of("a".repeat(41)), { name: "InvalidCategoryColorError" });
  });

  it("acepta una clave de exactamente 40 caracteres", () => {
    assert.doesNotThrow(() => CategoryColor.of("a".repeat(40)));
  });

  it("equals() compara las claves de forma exacta", () => {
    assert.ok(CategoryColor.of("teal_500").equals(CategoryColor.of("teal_500")));
    assert.ok(!CategoryColor.of("teal_500").equals(CategoryColor.of("Teal_500")));
  });
});
