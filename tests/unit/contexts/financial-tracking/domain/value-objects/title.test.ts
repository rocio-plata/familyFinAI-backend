import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Title } from "../../../../../src/contexts/financial-tracking/domain/value-objects/title.js";

describe("Title", () => {
  it("crea una instancia para título válido", () => {
    assert.doesNotThrow(() => Title.of("Supermercado"));
  });

  it("elimina espacios al inicio y final", () => {
    assert.equal(Title.of("  Supermercado  ").toString(), "Supermercado");
  });

  it("lanza InvalidTitleError para string vacío", () => {
    assert.throws(() => Title.of(""), { name: "InvalidTitleError" });
  });

  it("lanza InvalidTitleError para string solo con espacios", () => {
    assert.throws(() => Title.of("   "), { name: "InvalidTitleError" });
  });

  it("lanza InvalidTitleError para título mayor a 100 caracteres", () => {
    assert.throws(() => Title.of("a".repeat(101)), { name: "InvalidTitleError" });
  });

  it("acepta título de exactamente 100 caracteres", () => {
    assert.doesNotThrow(() => Title.of("a".repeat(100)));
  });

  it("equals() retorna true para el mismo valor", () => {
    assert.ok(Title.of("Supermercado").equals(Title.of("Supermercado")));
  });

  it("equals() retorna false para valores distintos", () => {
    assert.ok(!Title.of("Supermercado").equals(Title.of("Farmacia")));
  });
});
