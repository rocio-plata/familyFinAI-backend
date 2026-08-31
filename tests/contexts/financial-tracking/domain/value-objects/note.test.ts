import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Note } from "../../../../../src/contexts/financial-tracking/domain/value-objects/note.js";

describe("Note", () => {
  it("crea una instancia para nota válida", () => {
    assert.doesNotThrow(() => Note.of("Compra semanal"));
  });

  it("permite string vacío", () => {
    assert.doesNotThrow(() => Note.of(""));
  });

  it("elimina espacios al inicio y final", () => {
    assert.equal(Note.of("  Compra  ").toString(), "Compra");
  });

  it("lanza InvalidNoteError para nota mayor a 500 caracteres", () => {
    assert.throws(() => Note.of("a".repeat(501)), { name: "InvalidNoteError" });
  });

  it("acepta nota de exactamente 500 caracteres", () => {
    assert.doesNotThrow(() => Note.of("a".repeat(500)));
  });

  it("equals() retorna true para el mismo valor", () => {
    assert.ok(Note.of("hola").equals(Note.of("hola")));
  });

  it("equals() retorna false para valores distintos", () => {
    assert.ok(!Note.of("hola").equals(Note.of("chau")));
  });
});
