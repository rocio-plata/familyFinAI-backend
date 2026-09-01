// tests/contexts/financial-tracking/create-financial-item.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CreateFinancialItemUseCase } from "../../../src/contexts/financial-tracking/application/commands/create-financial-item.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryNotActiveError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-active.error.js";
import { CategoryNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { InvalidMoneyError } from "../../../src/contexts/financial-tracking/domain/errors/invalid-money.error.js";
import { InvalidTitleError } from "../../../src/contexts/financial-tracking/domain/errors/invalid-title.error.js";
import { TagDoesNotBelongToCategoryError } from "../../../src/contexts/financial-tracking/domain/errors/tag-does-not-belong-to-category.error.js";
import { TagNotActiveError } from "../../../src/contexts/financial-tracking/domain/errors/tag-not-active.error.js";
import { ItemRecorded } from "../../../src/contexts/financial-tracking/domain/events/item-recorded.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { TagId } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";
import { TagName } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { Title } from "../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "./doubles/in-memory-financial-item.repository.js";

describe("CreateFinancialItemUseCase", () => {
  let useCase: CreateFinancialItemUseCase;
  let itemRepository: InMemoryFinancialItemRepository;
  let categoryRepository: InMemoryCategoryRepository;
  let eventBus: FakeEventBus;
  let familyId: FamilyId;
  let recordedBy: UserId;

  beforeEach(() => {
    itemRepository = new InMemoryFinancialItemRepository();
    categoryRepository = new InMemoryCategoryRepository();
    eventBus = new FakeEventBus();
    useCase = new CreateFinancialItemUseCase(itemRepository, categoryRepository, eventBus);
    familyId = FamilyId.generate();
    recordedBy = UserId.generate();
  });

  test("registra un gasto con todos los campos obligatorios", async () => {
    const category = Category.create(familyId, CategoryName.of("Alimentación"));
    categoryRepository.add(category);

    const amount = Money.of(5000, Currency.default());
    const title = Title.of("Compra en supermercado");
    const occurredOn = TransactionDate.of(new Date("2024-01-15"));

    const item = await useCase.execute({
      familyId,
      recordedBy,
      categoryId: category.id,
      tagId: null,
      amount,
      title,
      note: null,
      occurredOn,
    });

    assert.ok(item.id);
    assert.ok(item.familyId.equals(familyId));
    assert.ok(item.recordedBy.equals(recordedBy));
    assert.equal(item.type, FinancialItemType.Expense);
    assert.equal(item.amount.amount, amount.amount);
    assert.equal(item.title, title);
    assert.equal(item.note, null);
    assert.ok(item.occurredOn.equals(occurredOn));
  });

  test("registra un gasto con tag", async () => {
    const category = Category.create(familyId, CategoryName.of("Transporte"));
    const tagName = TagName.of("Taxi");
    category.addTag(tagName);
    const tag = category.tags[0];
    categoryRepository.add(category);

    const amount = Money.of(8000, Currency.default());
    const title = Title.of("Viaje al trabajo");
    const occurredOn = TransactionDate.of(new Date("2024-01-15"));

    const item = await useCase.execute({
      familyId,
      recordedBy,
      categoryId: category.id,
      tagId: tag.id,
      amount,
      title,
      note: null,
      occurredOn,
    });

    assert.ok(item.categoryAssignment.categoryId.equals(category.id));
    assert.ok(item.categoryAssignment.tagId?.equals(tag.id));
  });

  test("dispara el evento ItemRecorded al crear el item", async () => {
    const category = Category.create(familyId, CategoryName.of("Servicios"));
    categoryRepository.add(category);

    const amount = Money.of(50000, Currency.default());
    const title = Title.of("Pago de internet");
    const occurredOn = TransactionDate.of(new Date("2024-01-15"));

    await useCase.execute({
      familyId,
      recordedBy,
      categoryId: category.id,
      tagId: null,
      amount,
      title,
      note: null,
      occurredOn,
    });

    assert.equal(eventBus.publishedEvents.length, 1);
    const event = eventBus.publishedEvents[0];
    assert.ok(event instanceof ItemRecorded);
    assert.equal(event.eventName, "financial-tracking.item-recorded");
  });

  test("rechaza monto negativo", async () => {
    try {
      Money.of(-1000, Currency.default());
      assert.fail("Debería haber lanzado InvalidMoneyError");
    } catch (e) {
      assert.ok(e instanceof InvalidMoneyError);
    }
  });

  test("rechaza título vacío", async () => {
    try {
      Title.of("");
      assert.fail("Debería haber lanzado InvalidTitleError");
    } catch (e) {
      assert.ok(e instanceof InvalidTitleError);
    }
  });

  test("rechaza categoría no encontrada", async () => {
    const nonExistentCategoryId = CategoryId.generate();

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          recordedBy,
          categoryId: nonExistentCategoryId,
          tagId: null,
          amount: Money.of(5000, Currency.default()),
          title: Title.of("Compra"),
          note: null,
          occurredOn: TransactionDate.of(new Date()),
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza categoría deprecada", async () => {
    const category = Category.create(familyId, CategoryName.of("Alimentación"));
    category.deprecate();
    categoryRepository.add(category);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          recordedBy,
          categoryId: category.id,
          tagId: null,
          amount: Money.of(5000, Currency.default()),
          title: Title.of("Compra"),
          note: null,
          occurredOn: TransactionDate.of(new Date()),
        }),
      CategoryNotActiveError,
    );
  });

  test("rechaza tag no encontrado en la categoría", async () => {
    const category = Category.create(familyId, CategoryName.of("Alimentación"));
    categoryRepository.add(category);
    const nonExistentTagId = TagId.generate();

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          recordedBy,
          categoryId: category.id,
          tagId: nonExistentTagId,
          amount: Money.of(5000, Currency.default()),
          title: Title.of("Compra"),
          note: null,
          occurredOn: TransactionDate.of(new Date()),
        }),
      TagDoesNotBelongToCategoryError,
    );
  });

  test("rechaza tag deprecado", async () => {
    const category = Category.create(familyId, CategoryName.of("Alimentación"));
    const tagName = TagName.of("Frutas");
    category.addTag(tagName);
    const tag = category.tags[0];
    tag.deprecate();
    categoryRepository.add(category);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          recordedBy,
          categoryId: category.id,
          tagId: tag.id,
          amount: Money.of(5000, Currency.default()),
          title: Title.of("Compra"),
          note: null,
          occurredOn: TransactionDate.of(new Date()),
        }),
      TagNotActiveError,
    );
  });

  test("rechaza tag que no pertenece a la categoría", async () => {
    const category1 = Category.create(familyId, CategoryName.of("Alimentación"));
    const category2 = Category.create(familyId, CategoryName.of("Transporte"));
    const tagName = TagName.of("Taxi");
    category2.addTag(tagName);
    const tagFromCategory2 = category2.tags[0];
    categoryRepository.add(category1);
    categoryRepository.add(category2);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          recordedBy,
          categoryId: category1.id,
          tagId: tagFromCategory2.id,
          amount: Money.of(5000, Currency.default()),
          title: Title.of("Compra"),
          note: null,
          occurredOn: TransactionDate.of(new Date()),
        }),
      TagDoesNotBelongToCategoryError,
    );
  });

  test("registra un ingreso si se especifica el tipo", async () => {
    const category = Category.create(familyId, CategoryName.of("Ingresos"));
    categoryRepository.add(category);

    const amount = Money.of(1000000, Currency.default());
    const title = Title.of("Sueldo mensual");
    const occurredOn = TransactionDate.of(new Date("2024-01-15"));

    const item = await useCase.execute({
      familyId,
      recordedBy,
      type: FinancialItemType.Income,
      categoryId: category.id,
      tagId: null,
      amount,
      title,
      note: null,
      occurredOn,
    });

    assert.equal(item.type, FinancialItemType.Income);
  });

  test("persiste el item en el repositorio", async () => {
    const category = Category.create(familyId, CategoryName.of("Alimentación"));
    categoryRepository.add(category);

    const amount = Money.of(5000, Currency.default());
    const title = Title.of("Compra");
    const occurredOn = TransactionDate.of(new Date("2024-01-15"));

    const item = await useCase.execute({
      familyId,
      recordedBy,
      categoryId: category.id,
      tagId: null,
      amount,
      title,
      note: null,
      occurredOn,
    });

    const found = await itemRepository.findById(item.id);
    assert.ok(found);
    assert.ok(found?.id.equals(item.id));
  });
});
