// tests/contexts/financial-tracking/reorder-category-tags.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { ReorderCategoryTagsUseCase } from "../../../src/contexts/financial-tracking/application/commands/reorder-category-tags.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { InvalidTagOrderError } from "../../../src/contexts/financial-tracking/domain/errors/invalid-tag-order.error.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { TagId } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";
import { TagName } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("ReorderCategoryTagsUseCase", () => {
  let useCase: ReorderCategoryTagsUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let familyId: FamilyId;
  let category: Category;

  beforeEach(() => {
    categoryRepository = new InMemoryCategoryRepository();
    useCase = new ReorderCategoryTagsUseCase(categoryRepository);

    familyId = FamilyId.generate();
    category = Category.create(familyId, CategoryName.of("Alimentación"));
    category.addTag(TagName.of("Supermercado"));
    category.addTag(TagName.of("Farmacia"));
    category.pullDomainEvents();
    categoryRepository.add(category);
  });

  test("reordena los tags según el array recibido", async () => {
    const [first, second] = category.tags;

    const updated = await useCase.execute({
      familyId,
      categoryId: category.id,
      orderedTagIds: [second.id, first.id],
    });

    assert.equal(updated.tags.find((t) => t.id.equals(second.id))?.displayOrder, 0);
    assert.equal(updated.tags.find((t) => t.id.equals(first.id))?.displayOrder, 1);
  });

  test("persiste el nuevo orden", async () => {
    const [first, second] = category.tags;

    await useCase.execute({
      familyId,
      categoryId: category.id,
      orderedTagIds: [second.id, first.id],
    });

    const persisted = await categoryRepository.findById(category.id);
    assert.equal(persisted?.tags.find((t) => t.id.equals(second.id))?.displayOrder, 0);
  });

  test("rechaza si la categoría no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          categoryId: CategoryId.generate(),
          orderedTagIds: [],
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si la categoría no pertenece a la familia", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId: FamilyId.generate(),
          categoryId: category.id,
          orderedTagIds: category.tags.map((t) => t.id),
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si el array de tags no coincide con los tags actuales", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          categoryId: category.id,
          orderedTagIds: [TagId.generate()],
        }),
      InvalidTagOrderError,
    );
  });
});
