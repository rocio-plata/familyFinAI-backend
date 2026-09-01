// tests/contexts/financial-tracking/reclassify-financial-item.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { ReclassifyFinancialItemUseCase } from "../../../src/contexts/financial-tracking/application/commands/reclassify-financial-item.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { FinancialItem } from "../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryNotActiveError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-active.error.js";
import { CategoryNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { FinancialItemNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/financial-item-not-found.error.js";
import { TagDoesNotBelongToCategoryError } from "../../../src/contexts/financial-tracking/domain/errors/tag-does-not-belong-to-category.error.js";
import { TagNotActiveError } from "../../../src/contexts/financial-tracking/domain/errors/tag-not-active.error.js";
import { ItemReclassified } from "../../../src/contexts/financial-tracking/domain/events/item-reclassified.event.js";
import { CategoryAssignment } from "../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { TagName } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { Title } from "../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "./doubles/in-memory-financial-item.repository.js";

describe("ReclassifyFinancialItemUseCase", () => {
  let useCase: ReclassifyFinancialItemUseCase;
  let itemRepository: InMemoryFinancialItemRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let eventBus: FakeEventBus;
  let familyId: FamilyId;
  let userId: UserId;
  let originalCategory: Category;
  let existingItem: FinancialItem;

  beforeEach(() => {
    itemRepository = new InMemoryFinancialItemRepository();
    categoryRepository = new InMemoryCategoryRepository();
    eventBus = new FakeEventBus();
    useCase = new ReclassifyFinancialItemUseCase(itemRepository, categoryRepository, eventBus);

    familyId = FamilyId.generate();
    userId = UserId.generate();

    originalCategory = Category.create(familyId, CategoryName.of("Alimentación"));
    categoryRepository.add(originalCategory);

    existingItem = FinancialItem.create({
      familyId,
      recordedBy: userId,
      amount: Money.of(5000, "CLP"),
      category: CategoryAssignment.of(originalCategory.id),
      title: Title.of("Compra de alimentos"),
      occurredOn: TransactionDate.of(new Date("2026-08-01")),
    });
    existingItem.pullDomainEvents();

    itemRepository.save(existingItem);
  });

  test("reclasifica el item a una nueva categoría activa", async () => {
    const newCategory = Category.create(familyId, CategoryName.of("Transporte"));
    categoryRepository.add(newCategory);

    const updated = await useCase.execute({
      familyId,
      itemId: existingItem.id,
      newCategoryId: newCategory.id,
      newTagId: null,
    });

    assert.ok(updated.categoryAssignment.categoryId.equals(newCategory.id));
  });

  test("reclasifica el item con un tag válido de la nueva categoría", async () => {
    const newCategory = Category.create(familyId, CategoryName.of("Transporte"));
    newCategory.addTag(TagName.of("Bencina"));
    categoryRepository.add(newCategory);
    const tagId = newCategory.tags[0]?.id;
    assert.ok(tagId);

    const updated = await useCase.execute({
      familyId,
      itemId: existingItem.id,
      newCategoryId: newCategory.id,
      newTagId: tagId,
    });

    assert.ok(updated.categoryAssignment.tagId?.equals(tagId));
  });

  test("dispara ItemReclassified", async () => {
    const newCategory = Category.create(familyId, CategoryName.of("Transporte"));
    categoryRepository.add(newCategory);

    await useCase.execute({
      familyId,
      itemId: existingItem.id,
      newCategoryId: newCategory.id,
      newTagId: null,
    });

    assert.strictEqual(eventBus.publishedEvents.length, 1);
    assert(eventBus.publishedEvents[0] instanceof ItemReclassified);
  });

  test("persiste la reclasificación", async () => {
    const newCategory = Category.create(familyId, CategoryName.of("Transporte"));
    categoryRepository.add(newCategory);

    await useCase.execute({
      familyId,
      itemId: existingItem.id,
      newCategoryId: newCategory.id,
      newTagId: null,
    });

    const persisted = await itemRepository.findById(existingItem.id);
    assert(persisted !== null);
    assert.ok(persisted.categoryAssignment.categoryId.equals(newCategory.id));
  });

  test("rechaza si el item no existe", async () => {
    const newCategory = Category.create(familyId, CategoryName.of("Transporte"));
    categoryRepository.add(newCategory);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          itemId: FinancialItemId.generate(),
          newCategoryId: newCategory.id,
          newTagId: null,
        }),
      FinancialItemNotFoundError,
    );
  });

  test("rechaza si el item no pertenece a la familia", async () => {
    const otherFamilyId = FamilyId.generate();
    const newCategory = Category.create(familyId, CategoryName.of("Transporte"));
    categoryRepository.add(newCategory);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: otherFamilyId,
          itemId: existingItem.id,
          newCategoryId: newCategory.id,
          newTagId: null,
        }),
      FinancialItemNotFoundError,
    );
  });

  test("rechaza si la nueva categoría no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          itemId: existingItem.id,
          newCategoryId: CategoryId.generate(),
          newTagId: null,
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si la nueva categoría está deprecada", async () => {
    const deprecatedCategory = Category.create(familyId, CategoryName.of("Vieja"));
    deprecatedCategory.deprecate();
    categoryRepository.add(deprecatedCategory);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          itemId: existingItem.id,
          newCategoryId: deprecatedCategory.id,
          newTagId: null,
        }),
      CategoryNotActiveError,
    );
  });

  test("rechaza si el tag no pertenece a la nueva categoría", async () => {
    const newCategory = Category.create(familyId, CategoryName.of("Transporte"));
    categoryRepository.add(newCategory);

    const otherCategory = Category.create(familyId, CategoryName.of("Ocio"));
    otherCategory.addTag(TagName.of("Cine"));
    const foreignTagId = otherCategory.tags[0]?.id;
    assert.ok(foreignTagId);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          itemId: existingItem.id,
          newCategoryId: newCategory.id,
          newTagId: foreignTagId,
        }),
      TagDoesNotBelongToCategoryError,
    );
  });

  test("rechaza si el tag está deprecado", async () => {
    const newCategory = Category.create(familyId, CategoryName.of("Transporte"));
    newCategory.addTag(TagName.of("Bencina"));
    const tag = newCategory.tags[0];
    assert.ok(tag);
    tag.deprecate();
    categoryRepository.add(newCategory);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          itemId: existingItem.id,
          newCategoryId: newCategory.id,
          newTagId: tag.id,
        }),
      TagNotActiveError,
    );
  });
});
