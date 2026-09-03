// tests/contexts/financial-tracking/get-categories.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { GetCategoriesQuery } from "../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { CategoryStatus } from "../../../src/contexts/financial-tracking/domain/value-objects/category-status.js";
import { TagName } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("GetCategoriesQuery", () => {
  let query: GetCategoriesQuery;
  let categoryRepository: InMemoryCategoryRepository;
  let familyId: FamilyId;
  let activeCategory: Category;
  let deprecatedCategory: Category;

  beforeEach(() => {
    categoryRepository = new InMemoryCategoryRepository();
    query = new GetCategoriesQuery(categoryRepository);

    familyId = FamilyId.generate();

    activeCategory = Category.create(familyId, CategoryName.of("Alimentación"));
    activeCategory.addTag(TagName.of("Verdulería"));
    activeCategory.addTag(TagName.of("Supermercado"));
    activeCategory.reorderTags([activeCategory.tags[1].id, activeCategory.tags[0].id]);
    activeCategory.pullDomainEvents();
    categoryRepository.add(activeCategory);

    deprecatedCategory = Category.create(familyId, CategoryName.of("Transporte"));
    deprecatedCategory.deprecate();
    deprecatedCategory.pullDomainEvents();
    categoryRepository.add(deprecatedCategory);
  });

  test("por defecto solo devuelve las categorías activas", async () => {
    const categories = await query.execute({ familyId });

    assert.equal(categories.length, 1);
    assert.equal(categories[0].id.toString(), activeCategory.id.toString());
  });

  test("incluye las deprecadas cuando includeDeprecated es true", async () => {
    const categories = await query.execute({ familyId, includeDeprecated: true });

    assert.equal(categories.length, 2);
  });

  test("devuelve lista vacía si la familia no tiene categorías", async () => {
    const categories = await query.execute({ familyId: FamilyId.generate() });

    assert.deepEqual(categories, []);
  });

  test("devuelve los tags ordenados por displayOrder", async () => {
    const [category] = await query.execute({ familyId });

    assert.equal(category.tags.length, 2);
    assert.equal(category.tags[0].name.toString(), "Supermercado");
    assert.equal(category.tags[1].name.toString(), "Verdulería");
  });

  test("mapea los campos de la categoría a DTO", async () => {
    const [category] = await query.execute({ familyId });

    assert.equal(category.id.toString(), activeCategory.id.toString());
    assert.equal(category.name.toString(), "Alimentación");
    assert.equal(category.status, CategoryStatus.Active);
  });

  test("no incluye tags eliminados de la categoría en el resultado", async () => {
    const category = Category.create(familyId, CategoryName.of("Sin tags"));
    categoryRepository.add(category);

    const categories = await query.execute({ familyId });
    const empty = categories.find((c) => c.id.toString() === category.id.toString());

    assert.deepEqual(empty?.tags, []);
  });
});
