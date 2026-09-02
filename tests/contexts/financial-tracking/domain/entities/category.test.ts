import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { Category } from "../../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { InvalidTagOrderError } from "../../../../../src/contexts/financial-tracking/domain/errors/invalid-tag-order.error.js";
import { CategoryName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { CategoryStatus } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-status.js";
import { TagId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";
import { TagName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";

describe("Category", () => {
  const familyId = FamilyId.generate();
  const catName = CategoryName.of("Alimentación");

  describe("create()", () => {
    it("crea una categoría activa", () => {
      assert.equal(Category.create(familyId, catName).status, CategoryStatus.Active);
    });

    it("inicia sin tags", () => {
      assert.equal(Category.create(familyId, catName).tags.length, 0);
    });

    it("asigna el familyId", () => {
      assert.ok(Category.create(familyId, catName).familyId.equals(familyId));
    });

    it("genera un id único por cada categoría", () => {
      assert.ok(
        !Category.create(familyId, catName).id.equals(Category.create(familyId, catName).id),
      );
    });
  });

  describe("addTag()", () => {
    it("agrega un tag a la categoría", () => {
      const cat = Category.create(familyId, catName);
      cat.addTag(TagName.of("Supermercado"));
      assert.equal(cat.tags.length, 1);
    });

    it("asigna displayOrder incremental a cada tag", () => {
      const cat = Category.create(familyId, catName);
      cat.addTag(TagName.of("Supermercado"));
      cat.addTag(TagName.of("Farmacia"));
      assert.equal(cat.tags[0]?.displayOrder, 0);
      assert.equal(cat.tags[1]?.displayOrder, 1);
    });

    it("dispara TagCreated", () => {
      const cat = Category.create(familyId, catName);
      cat.pullDomainEvents();
      cat.addTag(TagName.of("Supermercado"));
      const events = cat.pullDomainEvents();
      assert.equal(events.length, 1);
      assert.equal(events[0]?.eventName, "financial-tracking.tag-created");
    });
  });

  describe("rename()", () => {
    it("actualiza el nombre de la categoría", () => {
      const cat = Category.create(familyId, catName);
      const newName = CategoryName.of("Transporte");
      cat.rename(newName);
      assert.ok(cat.name.equals(newName));
    });
  });

  describe("deprecate()", () => {
    it("cambia el estado a Deprecated", () => {
      const cat = Category.create(familyId, catName);
      cat.deprecate();
      assert.equal(cat.status, CategoryStatus.Deprecated);
    });

    it("dispara CategoryDeprecated", () => {
      const cat = Category.create(familyId, catName);
      cat.pullDomainEvents();
      cat.deprecate();
      const events = cat.pullDomainEvents();
      assert.equal(events.length, 1);
      assert.equal(events[0]?.eventName, "financial-tracking.category-deprecated");
    });
  });

  describe("reactivate()", () => {
    it("vuelve el estado a Active", () => {
      const cat = Category.create(familyId, catName);
      cat.deprecate();
      cat.reactivate();
      assert.equal(cat.status, CategoryStatus.Active);
    });
  });

  describe("reorderTags()", () => {
    it("reasigna displayOrder según la posición en el array recibido", () => {
      const cat = Category.create(familyId, catName);
      cat.addTag(TagName.of("Supermercado"));
      cat.addTag(TagName.of("Farmacia"));
      const [first, second] = cat.tags;

      cat.reorderTags([second.id, first.id]);

      assert.equal(cat.tags.find((t) => t.id.equals(second.id))?.displayOrder, 0);
      assert.equal(cat.tags.find((t) => t.id.equals(first.id))?.displayOrder, 1);
    });

    it("lanza InvalidTagOrderError si falta un tag en el array", () => {
      const cat = Category.create(familyId, catName);
      cat.addTag(TagName.of("Supermercado"));
      cat.addTag(TagName.of("Farmacia"));
      const [first] = cat.tags;

      assert.throws(() => cat.reorderTags([first.id]), InvalidTagOrderError);
    });

    it("lanza InvalidTagOrderError si el array tiene un tag que no pertenece a la categoría", () => {
      const cat = Category.create(familyId, catName);
      cat.addTag(TagName.of("Supermercado"));
      const foreignTagId = TagId.generate();
      const [first] = cat.tags;

      assert.throws(() => cat.reorderTags([first.id, foreignTagId]), InvalidTagOrderError);
    });

    it("lanza InvalidTagOrderError si el array tiene un tag duplicado", () => {
      const cat = Category.create(familyId, catName);
      cat.addTag(TagName.of("Supermercado"));
      cat.addTag(TagName.of("Farmacia"));
      const [first] = cat.tags;

      assert.throws(() => cat.reorderTags([first.id, first.id]), InvalidTagOrderError);
    });
  });
});
