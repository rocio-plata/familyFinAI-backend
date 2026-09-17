import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CategoryId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("CategoryId", () => {
  describe("generate()", () => {
    it("devuelve una instancia de CategoryId", () => {
      assert.ok(CategoryId.generate() instanceof CategoryId);
    });

    it("cada llamada genera un id único", () => {
      assert.ok(!CategoryId.generate().equals(CategoryId.generate()));
    });
  });

  describe("of()", () => {
    it("crea un CategoryId desde un UUID válido", () => {
      assert.doesNotThrow(() => CategoryId.of(VALID_UUID));
    });

    it("lanza InvalidCategoryIdError para UUID inválido", () => {
      assert.throws(() => CategoryId.of("not-a-uuid"), { name: "InvalidCategoryIdError" });
    });

    it("lanza InvalidCategoryIdError para string vacío", () => {
      assert.throws(() => CategoryId.of(""), { name: "InvalidCategoryIdError" });
    });
  });

  describe("equals()", () => {
    it("retorna true para el mismo valor", () => {
      assert.ok(CategoryId.of(VALID_UUID).equals(CategoryId.of(VALID_UUID)));
    });

    it("retorna false para valores distintos", () => {
      assert.ok(!CategoryId.generate().equals(CategoryId.generate()));
    });
  });

  describe("toString()", () => {
    it("devuelve el UUID como string", () => {
      assert.equal(CategoryId.of(VALID_UUID).toString(), VALID_UUID);
    });
  });
});
