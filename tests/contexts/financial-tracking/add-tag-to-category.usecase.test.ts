// tests/contexts/financial-tracking/add-tag-to-category.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { AddTagToCategoryUseCase } from "../../../src/contexts/financial-tracking/application/commands/add-tag-to-category.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryNotActiveError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-active.error.js";
import { CategoryNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { DuplicateTagNameError } from "../../../src/contexts/financial-tracking/domain/errors/duplicate-tag-name.error.js";
import { TagCreated } from "../../../src/contexts/financial-tracking/domain/events/tag-created.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { TagName } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("AddTagToCategoryUseCase", () => {
  let useCase: AddTagToCategoryUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let eventBus: FakeEventBus;
  let familyId: FamilyId;
  let category: Category;

  beforeEach(() => {
    categoryRepository = new InMemoryCategoryRepository();
    eventBus = new FakeEventBus();
    useCase = new AddTagToCategoryUseCase(categoryRepository, eventBus);

    familyId = FamilyId.generate();
    category = Category.create(familyId, CategoryName.of("Alimentación"));
    category.pullDomainEvents();
    categoryRepository.add(category);
  });

  test("agrega un tag nuevo a la categoría", async () => {
    const updated = await useCase.execute({
      familyId,
      categoryId: category.id,
      tagName: TagName.of("Supermercado"),
    });

    assert.equal(updated.tags.length, 1);
    assert.equal(updated.tags[0]?.name.toString(), "Supermercado");
  });

  test("persiste el tag agregado", async () => {
    await useCase.execute({
      familyId,
      categoryId: category.id,
      tagName: TagName.of("Supermercado"),
    });

    const persisted = await categoryRepository.findById(category.id);
    assert.equal(persisted?.tags.length, 1);
  });

  test("dispara TagCreated", async () => {
    await useCase.execute({
      familyId,
      categoryId: category.id,
      tagName: TagName.of("Supermercado"),
    });

    assert.strictEqual(eventBus.publishedEvents.length, 1);
    assert(eventBus.publishedEvents[0] instanceof TagCreated);
  });

  test("rechaza si la categoría no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          categoryId: CategoryId.generate(),
          tagName: TagName.of("Supermercado"),
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
          tagName: TagName.of("Supermercado"),
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si la categoría está deprecada", async () => {
    category.deprecate();

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          categoryId: category.id,
          tagName: TagName.of("Supermercado"),
        }),
      CategoryNotActiveError,
    );
  });

  test("rechaza si ya existe un tag con ese nombre (case-insensitive) en la categoría", async () => {
    category.addTag(TagName.of("Supermercado"));

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          categoryId: category.id,
          tagName: TagName.of("supermercado"),
        }),
      DuplicateTagNameError,
    );
  });
});
