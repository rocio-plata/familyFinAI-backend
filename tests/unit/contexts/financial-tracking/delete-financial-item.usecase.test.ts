// tests/contexts/financial-tracking/delete-financial-item.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { DeleteFinancialItemUseCase } from "../../../src/contexts/financial-tracking/application/commands/delete-financial-item.usecase.js";
import { FinancialItem } from "../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { FinancialItemNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/financial-item-not-found.error.js";
import { ItemDeleted } from "../../../src/contexts/financial-tracking/domain/events/item-deleted.event.js";
import { CategoryAssignment } from "../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Title } from "../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryFinancialItemRepository } from "./doubles/in-memory-financial-item.repository.js";

describe("DeleteFinancialItemUseCase", () => {
  let useCase: DeleteFinancialItemUseCase;
  let itemRepository: InMemoryFinancialItemRepository;
  let eventBus: FakeEventBus;
  let familyId: FamilyId;
  let userId: UserId;
  let existingItem: FinancialItem;

  beforeEach(() => {
    itemRepository = new InMemoryFinancialItemRepository();
    eventBus = new FakeEventBus();
    useCase = new DeleteFinancialItemUseCase(itemRepository, eventBus);

    familyId = FamilyId.generate();
    userId = UserId.generate();

    existingItem = FinancialItem.create({
      familyId,
      recordedBy: userId,
      amount: Money.of(5000, "CLP"),
      category: CategoryAssignment.of(CategoryId.generate()),
      title: Title.of("Compra de alimentos"),
      occurredOn: TransactionDate.of(new Date("2026-08-01")),
    });
    existingItem.pullDomainEvents();

    itemRepository.save(existingItem);
  });

  test("elimina el item existente", async () => {
    await useCase.execute({ familyId, itemId: existingItem.id });

    const persisted = await itemRepository.findById(existingItem.id);
    assert.strictEqual(persisted, null);
  });

  test("dispara ItemDeleted", async () => {
    await useCase.execute({ familyId, itemId: existingItem.id });

    assert.strictEqual(eventBus.publishedEvents.length, 1);
    assert(eventBus.publishedEvents[0] instanceof ItemDeleted);
  });

  test("rechaza si el item no existe", async () => {
    const nonExistentId = FinancialItemId.generate();

    await assert.rejects(
      () => useCase.execute({ familyId, itemId: nonExistentId }),
      FinancialItemNotFoundError,
    );
  });

  test("rechaza si el item no pertenece a la familia", async () => {
    const otherFamilyId = FamilyId.generate();

    await assert.rejects(
      () => useCase.execute({ familyId: otherFamilyId, itemId: existingItem.id }),
      FinancialItemNotFoundError,
    );
  });
});
