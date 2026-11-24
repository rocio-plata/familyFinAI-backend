import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { Category } from "../../../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { InvalidTagOrderError } from "../../../../../../src/contexts/financial-tracking/domain/errors/invalid-tag-order.error.js";
import { TagNotFoundError } from "../../../../../../src/contexts/financial-tracking/domain/errors/tag-not-found.error.js";
import { CategoryColor } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-color.js";
import { CategoryIcon } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-icon.js";
import { CategoryName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { CategoryStatus } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-status.js";
import { FinancialItemType } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { TagId } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";
import { TagName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";

describe("Category", () => {
  const familyId = FamilyId.generate();
  const catName = CategoryName.of("Alimentación");
  const type = FinancialItemType.Expense;

  describe("create()", () => {
    it("crea una categoría activa", () => {
      assert.equal(Category.create(familyId, type, catName).status, CategoryStatus.Active);
    });

    it("inicia sin tags", () => {
      assert.equal(Category.create(familyId, type, catName).tags.length, 0);
    });

    it("inicia sin ícono cuando no se recibe uno", () => {
      assert.equal(Category.create(familyId, type, catName).icon, null);
    });

    it("asigna el ícono recibido", () => {
      const icon = CategoryIcon.of("shopping_cart");

      assert.ok(Category.create(familyId, type, catName, icon).icon?.equals(icon));
    });

    it("inicia sin color cuando no se recibe uno", () => {
      assert.equal(Category.create(familyId, type, catName).color, null);
    });

    it("asigna el color recibido", () => {
      const color = CategoryColor.of("teal_500");

      assert.ok(Category.create(familyId, type, catName, undefined, color).color?.equals(color));
    });

    it("asigna el familyId", () => {
      assert.ok(Category.create(familyId, type, catName).familyId.equals(familyId));
    });

    it("genera un id único por cada categoría", () => {
      assert.ok(
        !Category.create(familyId, type, catName).id.equals(
          Category.create(familyId, type, catName).id,
        ),
      );
    });

    it("asigna el type recibido", () => {
      assert.equal(
        Category.create(familyId, FinancialItemType.Income, catName).type,
        FinancialItemType.Income,
      );
    });

    it("no expone forma de cambiar el type una vez creada", () => {
      const cat = Category.create(familyId, type, catName);
      assert.equal((cat as unknown as { changeType?: unknown }).changeType, undefined);
    });
  });

  describe("reconstitute()", () => {
    it("reconstituye una categoría con ícono", () => {
      const category = Category.reconstitute({
        id: "11111111-1111-4111-8111-111111111111",
        familyId: "22222222-2222-4222-8222-222222222222",
        type,
        name: "Alimentación",
        icon: "shopping_cart",
        status: CategoryStatus.Active,
        tags: [],
      });

      assert.equal(category.icon?.toString(), "shopping_cart");
    });

    it("reconstituye una categoría sin ícono", () => {
      const category = Category.reconstitute({
        id: "11111111-1111-4111-8111-111111111111",
        familyId: "22222222-2222-4222-8222-222222222222",
        type,
        name: "Alimentación",
        icon: null,
        status: CategoryStatus.Active,
        tags: [],
      });

      assert.equal(category.icon, null);
    });
  });

  describe("reconstitute() con color", () => {
    const base = {
      id: "11111111-1111-4111-8111-111111111111",
      familyId: "22222222-2222-4222-8222-222222222222",
      type,
      name: "Alimentación",
      status: CategoryStatus.Active,
      tags: [],
    };

    it("reconstituye una categoría con color", () => {
      assert.equal(
        Category.reconstitute({ ...base, color: "teal_500" }).color?.toString(),
        "teal_500",
      );
    });

    it("reconstituye una categoría sin color", () => {
      assert.equal(Category.reconstitute({ ...base, color: null }).color, null);
      assert.equal(Category.reconstitute(base).color, null);
    });
  });

  describe("addTag()", () => {
    it("agrega un tag a la categoría", () => {
      const cat = Category.create(familyId, type, catName);
      cat.addTag(TagName.of("Supermercado"));
      assert.equal(cat.tags.length, 1);
    });

    it("asigna displayOrder incremental a cada tag", () => {
      const cat = Category.create(familyId, type, catName);
      cat.addTag(TagName.of("Supermercado"));
      cat.addTag(TagName.of("Farmacia"));
      assert.equal(cat.tags[0]?.displayOrder, 0);
      assert.equal(cat.tags[1]?.displayOrder, 1);
    });

    it("dispara TagCreated", () => {
      const cat = Category.create(familyId, type, catName);
      cat.pullDomainEvents();
      cat.addTag(TagName.of("Supermercado"));
      const events = cat.pullDomainEvents();
      assert.equal(events.length, 1);
      assert.equal(events[0]?.eventName, "financial-tracking.tag-created");
    });
  });

  describe("rename()", () => {
    it("actualiza el nombre de la categoría", () => {
      const cat = Category.create(familyId, type, catName);
      const newName = CategoryName.of("Transporte");
      cat.rename(newName);
      assert.ok(cat.name.equals(newName));
    });
  });

  describe("updateIcon()", () => {
    it("asigna un ícono a la categoría", () => {
      const cat = Category.create(familyId, type, catName);
      const icon = CategoryIcon.of("shopping_cart");

      cat.updateIcon(icon);

      assert.ok(cat.icon?.equals(icon));
    });

    it("quita el ícono de la categoría al recibir null", () => {
      const cat = Category.create(familyId, type, catName, CategoryIcon.of("shopping_cart"));

      cat.updateIcon(null);

      assert.equal(cat.icon, null);
    });
  });

  describe("updateColor()", () => {
    it("asigna un color a la categoría", () => {
      const cat = Category.create(familyId, type, catName);
      const color = CategoryColor.of("teal_500");

      cat.updateColor(color);

      assert.ok(cat.color?.equals(color));
    });

    it("quita el color de la categoría al recibir null", () => {
      const cat = Category.create(familyId, type, catName, undefined, CategoryColor.of("teal_500"));

      cat.updateColor(null);

      assert.equal(cat.color, null);
    });
  });

  describe("deprecate()", () => {
    it("cambia el estado a Deprecated", () => {
      const cat = Category.create(familyId, type, catName);
      cat.deprecate();
      assert.equal(cat.status, CategoryStatus.Deprecated);
    });

    it("dispara CategoryDeprecated", () => {
      const cat = Category.create(familyId, type, catName);
      cat.pullDomainEvents();
      cat.deprecate();
      const events = cat.pullDomainEvents();
      assert.equal(events.length, 1);
      assert.equal(events[0]?.eventName, "financial-tracking.category-deprecated");
    });
  });

  describe("reactivate()", () => {
    it("vuelve el estado a Active", () => {
      const cat = Category.create(familyId, type, catName);
      cat.deprecate();
      cat.reactivate();
      assert.equal(cat.status, CategoryStatus.Active);
    });

    it("limpia la fecha de archivado", () => {
      const cat = Category.create(familyId, type, catName);
      cat.deprecate();
      cat.reactivate();
      assert.equal(cat.deprecatedAt, null);
    });
  });

  describe("deprecatedAt", () => {
    it("es null en una categoría nueva", () => {
      assert.equal(Category.create(familyId, type, catName).deprecatedAt, null);
    });

    it("registra la fecha al deprecar", () => {
      const cat = Category.create(familyId, type, catName);
      cat.deprecate();
      assert.ok(cat.deprecatedAt instanceof Date);
    });

    it("se conserva al reconstituir", () => {
      const at = new Date("2026-11-01T10:00:00.000Z");
      const cat = Category.reconstitute({
        id: crypto.randomUUID(),
        familyId: familyId.toString(),
        type,
        name: "Alimentación",
        status: CategoryStatus.Deprecated,
        deprecatedAt: at,
        displayOrder: 3,
        tags: [],
      });
      assert.equal(cat.deprecatedAt?.toISOString(), at.toISOString());
      assert.equal(cat.displayOrder, 3);
    });
  });

  describe("displayOrder", () => {
    it("es 0 por defecto", () => {
      assert.equal(Category.create(familyId, type, catName).displayOrder, 0);
    });

    it("usa el orden recibido al crear", () => {
      const cat = Category.create(familyId, type, catName, undefined, undefined, 4);
      assert.equal(cat.displayOrder, 4);
    });

    it("changeDisplayOrder actualiza el orden", () => {
      const cat = Category.create(familyId, type, catName);
      cat.changeDisplayOrder(2);
      assert.equal(cat.displayOrder, 2);
    });
  });

  describe("reactivateTag()", () => {
    it("vuelve a Active un tag deprecado y dispara TagReactivated", () => {
      const cat = Category.create(familyId, type, catName);
      cat.addTag(TagName.of("Supermercado"));
      const tagId = cat.tags[0].id;
      cat.deprecateTag(tagId);
      cat.pullDomainEvents();
      cat.reactivateTag(tagId);
      assert.equal(cat.tags[0].status, "ACTIVE");
      const events = cat.pullDomainEvents();
      assert.equal(events[0]?.eventName, "financial-tracking.tag-reactivated");
    });

    it("lanza TagNotFoundError si el tag no existe", () => {
      const cat = Category.create(familyId, type, catName);
      assert.throws(() => cat.reactivateTag(TagId.generate()), TagNotFoundError);
    });
  });

  describe("reorderTags()", () => {
    it("reasigna displayOrder según la posición en el array recibido", () => {
      const cat = Category.create(familyId, type, catName);
      cat.addTag(TagName.of("Supermercado"));
      cat.addTag(TagName.of("Farmacia"));
      const [first, second] = cat.tags;

      cat.reorderTags([second.id, first.id]);

      assert.equal(cat.tags.find((t) => t.id.equals(second.id))?.displayOrder, 0);
      assert.equal(cat.tags.find((t) => t.id.equals(first.id))?.displayOrder, 1);
    });

    it("lanza InvalidTagOrderError si falta un tag en el array", () => {
      const cat = Category.create(familyId, type, catName);
      cat.addTag(TagName.of("Supermercado"));
      cat.addTag(TagName.of("Farmacia"));
      const [first] = cat.tags;

      assert.throws(() => cat.reorderTags([first.id]), InvalidTagOrderError);
    });

    it("lanza InvalidTagOrderError si el array tiene un tag que no pertenece a la categoría", () => {
      const cat = Category.create(familyId, type, catName);
      cat.addTag(TagName.of("Supermercado"));
      const foreignTagId = TagId.generate();
      const [first] = cat.tags;

      assert.throws(() => cat.reorderTags([first.id, foreignTagId]), InvalidTagOrderError);
    });

    it("lanza InvalidTagOrderError si el array tiene un tag duplicado", () => {
      const cat = Category.create(familyId, type, catName);
      cat.addTag(TagName.of("Supermercado"));
      cat.addTag(TagName.of("Farmacia"));
      const [first] = cat.tags;

      assert.throws(() => cat.reorderTags([first.id, first.id]), InvalidTagOrderError);
    });
  });
});
