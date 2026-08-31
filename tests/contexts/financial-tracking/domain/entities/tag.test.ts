import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Tag } from "../../../../../src/contexts/financial-tracking/domain/entities/tag.js";
import { TagName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { TagStatus } from "../../../../../src/contexts/financial-tracking/domain/value-objects/tag-status.js";

describe("Tag", () => {
  const name = TagName.of("Supermercado");

  describe("create()", () => {
    it("crea un tag activo", () => {
      assert.equal(Tag.create(name, 0).status, TagStatus.Active);
    });

    it("asigna el orden de visualización", () => {
      assert.equal(Tag.create(name, 2).displayOrder, 2);
    });

    it("genera un id único por cada tag", () => {
      assert.ok(!Tag.create(name, 0).id.equals(Tag.create(name, 1).id));
    });
  });

  describe("rename()", () => {
    it("actualiza el nombre del tag", () => {
      const tag = Tag.create(name, 0);
      const newName = TagName.of("Farmacia");
      tag.rename(newName);
      assert.ok(tag.name.equals(newName));
    });
  });

  describe("changeDisplayOrder()", () => {
    it("actualiza el orden de visualización", () => {
      const tag = Tag.create(name, 0);
      tag.changeDisplayOrder(5);
      assert.equal(tag.displayOrder, 5);
    });
  });

  describe("deprecate()", () => {
    it("cambia el estado a Deprecated", () => {
      const tag = Tag.create(name, 0);
      tag.deprecate();
      assert.equal(tag.status, TagStatus.Deprecated);
    });
  });
});
