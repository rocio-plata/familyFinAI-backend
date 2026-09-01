// tests/contexts/financial-tracking/update-financial-item.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { UpdateFinancialItemUseCase } from "../../../src/contexts/financial-tracking/application/commands/update-financial-item.usecase.js";
import { FinancialItem } from "../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { FinancialItemNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/financial-item-not-found.error.js";
import { ItemAmountChanged } from "../../../src/contexts/financial-tracking/domain/events/item-amount-changed.event.js";
import { CategoryAssignment } from "../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Title } from "../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryFinancialItemRepository } from "./doubles/in-memory-financial-item.repository.js";

describe("UpdateFinancialItemUseCase", () => {
  let useCase: UpdateFinancialItemUseCase;
  let itemRepository: InMemoryFinancialItemRepository;
  let eventBus: FakeEventBus;
  let familyId: FamilyId;
  let userId: UserId;
  let existingItem: FinancialItem;

  beforeEach(() => {
    itemRepository = new InMemoryFinancialItemRepository();
    eventBus = new FakeEventBus();
    useCase = new UpdateFinancialItemUseCase(itemRepository, eventBus);

    familyId = FamilyId.generate();
    userId = UserId.generate();

    // Crear un item existente
    existingItem = FinancialItem.create({
      familyId,
      recordedBy: userId,
      amount: Money.of(5000, "CLP"),
      category: CategoryAssignment.of(CategoryId.generate(), null),
      title: Title.of("Compra de alimentos"),
      occurredOn: TransactionDate.of(new Date("2026-09-01")),
    });

    // Limpiar eventos de creación
    existingItem.pullDomainEvents();

    itemRepository.save(existingItem);
  });

  test("actualiza solo el monto", async () => {
    const newAmount = Money.of(7500, "CLP");

    const updated = await useCase.execute({
      familyId,
      itemId: existingItem.id,
      amount: newAmount,
    });

    assert.strictEqual(updated.amount.amount, 7500);
    assert.strictEqual(updated.title.toString(), "Compra de alimentos");
  });

  test("actualiza solo la fecha", async () => {
    const newDate = TransactionDate.of(new Date("2026-08-15"));

    const updated = await useCase.execute({
      familyId,
      itemId: existingItem.id,
      occurredOn: newDate,
    });

    assert.strictEqual(updated.amount.amount, 5000);
    assert(updated.occurredOn.equals(newDate));
  });

  test("actualiza solo el título", async () => {
    const newTitle = Title.of("Compra en farmacia");

    const updated = await useCase.execute({
      familyId,
      itemId: existingItem.id,
      title: newTitle,
    });

    assert.strictEqual(updated.amount.amount, 5000);
    assert.strictEqual(updated.title.toString(), "Compra en farmacia");
  });

  test("actualiza múltiples campos a la vez", async () => {
    const newAmount = Money.of(8000, "CLP");
    const newTitle = Title.of("Compra importante");
    const newDate = TransactionDate.of(new Date("2026-08-20"));

    const updated = await useCase.execute({
      familyId,
      itemId: existingItem.id,
      amount: newAmount,
      title: newTitle,
      occurredOn: newDate,
    });

    assert.strictEqual(updated.amount.amount, 8000);
    assert.strictEqual(updated.title.toString(), "Compra importante");
    assert(updated.occurredOn.equals(newDate));
  });

  test("dispara evento solo cuando se actualiza el monto", async () => {
    const newTitle = Title.of("Título nuevo");

    await useCase.execute({
      familyId,
      itemId: existingItem.id,
      title: newTitle,
    });

    assert.strictEqual(eventBus.publishedEvents.length, 0);
  });

  test("dispara ItemAmountChanged solo cuando se actualiza monto", async () => {
    const newAmount = Money.of(9000, "CLP");

    await useCase.execute({
      familyId,
      itemId: existingItem.id,
      amount: newAmount,
    });

    assert.strictEqual(eventBus.publishedEvents.length, 1);
    assert(eventBus.publishedEvents[0] instanceof ItemAmountChanged);
  });

  test("persiste todos los cambios", async () => {
    const newAmount = Money.of(6000, "CLP");
    const newTitle = Title.of("Nuevo gasto");

    await useCase.execute({
      familyId,
      itemId: existingItem.id,
      amount: newAmount,
      title: newTitle,
    });

    const persisted = await itemRepository.findById(existingItem.id);
    assert(persisted !== null);
    assert.strictEqual(persisted.amount.amount, 6000);
    assert.strictEqual(persisted.title.toString(), "Nuevo gasto");
  });

  test("rechaza si el item no existe", async () => {
    const nonExistentId = FinancialItemId.generate();
    const newAmount = Money.of(7500, "CLP");

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          itemId: nonExistentId,
          amount: newAmount,
        }),
      FinancialItemNotFoundError,
    );
  });

  test("rechaza si el item no pertenece a la familia", async () => {
    const otherFamilyId = FamilyId.generate();
    const newAmount = Money.of(7500, "CLP");

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: otherFamilyId,
          itemId: existingItem.id,
          amount: newAmount,
        }),
      FinancialItemNotFoundError,
    );
  });
});
