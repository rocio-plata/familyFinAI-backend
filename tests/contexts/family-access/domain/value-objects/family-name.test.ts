import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyName } from "../../../../../src/contexts/family-access/domain/value-objects/family-name.js";

describe("FamilyName", () => {
  it("crea una instancia para un nombre válido", () => {
    assert.doesNotThrow(() => FamilyName.of("Los García"));
  });

  it("lanza InvalidFamilyNameError para string vacío", () => {
    assert.throws(() => FamilyName.of(""), { name: "InvalidFamilyNameError" });
  });

  it("lanza InvalidFamilyNameError para string solo con espacios", () => {
    assert.throws(() => FamilyName.of("   "), { name: "InvalidFamilyNameError" });
  });

  it("lanza InvalidFamilyNameError para nombre mayor a 60 caracteres", () => {
    assert.throws(() => FamilyName.of("a".repeat(61)), { name: "InvalidFamilyNameError" });
  });

  it("acepta nombre de exactamente 60 caracteres", () => {
    assert.doesNotThrow(() => FamilyName.of("a".repeat(60)));
  });
});
