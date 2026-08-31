import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CategoryName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";

describe("CategoryName", () => {
  it("crea una instancia para nombre válido", () => {
    assert.doesNotThrow(() => CategoryName.of("Alimentación"));
  });

  it("elimina espacios al inicio y final", () => {
    assert.equal(CategoryName.of("  Alimentación  ").toString(), "Alimentación");
  });

  it("lanza InvalidCategoryNameError para string vacío", () => {
    assert.throws(() => CategoryName.of(""), { name: "InvalidCategoryNameError" });
  });

  it("lanza InvalidCategoryNameError para string solo con espacios", () => {
    assert.throws(() => CategoryName.of("   "), { name: "InvalidCategoryNameError" });
  });

  it("lanza InvalidCategoryNameError para nombre mayor a 50 caracteres", () => {
    assert.throws(() => CategoryName.of("a".repeat(51)), { name: "InvalidCategoryNameError" });
  });

  it("acepta nombre de exactamente 50 caracteres", () => {
    assert.doesNotThrow(() => CategoryName.of("a".repeat(50)));
  });

  it("equals() es case-insensitive", () => {
    assert.ok(CategoryName.of("Alimentación").equals(CategoryName.of("alimentación")));
  });

  it("equals() retorna false para nombres distintos", () => {
    assert.ok(!CategoryName.of("Alimentación").equals(CategoryName.of("Transporte")));
  });
});
