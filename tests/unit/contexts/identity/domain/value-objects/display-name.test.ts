import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidDisplayNameError } from "../../../../../src/contexts/identity/domain/errors/invalid-display-name.error.js";
import { DisplayName } from "../../../../../src/contexts/identity/domain/value-objects/display-name.js";

describe("DisplayName", () => {
  it("acepta un nombre válido, recortando espacios", () => {
    const name = DisplayName.of("  Rocío  ");
    assert.equal(name.toString(), "Rocío");
  });

  it("rechaza un nombre vacío", () => {
    assert.throws(() => DisplayName.of("   "), InvalidDisplayNameError);
  });

  it("rechaza un nombre que excede el largo máximo", () => {
    assert.throws(() => DisplayName.of("a".repeat(61)), InvalidDisplayNameError);
  });

  it("equals() compara por valor", () => {
    assert.ok(DisplayName.of("Rocío").equals(DisplayName.of("Rocío")));
    assert.ok(!DisplayName.of("Rocío").equals(DisplayName.of("Ana")));
  });
});
