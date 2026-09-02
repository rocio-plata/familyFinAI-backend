// tests/contexts/financial-tracking/delete-category.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { DeleteCategoryUseCase } from "../../../src/contexts/financial-tracking/application/commands/delete-category.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { FinancialItem } from "../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryHasAssociatedItemsError } from "../../../src/contexts/financial-tracking/domain/errors/category-has-associated-items.error.js";
import { CategoryNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { InsufficientRoleError } from "../../../src/contexts/financial-tracking/domain/errors/insufficient-role.error.js";
import { CategoryDeletionService } from "../../../src/contexts/financial-tracking/domain/services/category-deletion.service.js";
import { CategoryAssignment } from "../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Title } from "../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "./doubles/in-memory-financial-item.repository.js";

describe("DeleteCategoryUseCase", () => {
  let useCase: DeleteCategoryUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let financialItemRepository: InMemoryFinancialItemRepository;
  let familyRepository: InMemoryFamilyRepository;
  let familyId: FamilyId;
  let ownerId: UserId;
  let memberId: UserId;
  let category: Category;

  beforeEach(async () => {
    categoryRepository = new InMemoryCategoryRepository();
    financialItemRepository = new InMemoryFinancialItemRepository();
    familyRepository = new InMemoryFamilyRepository();
    useCase = new DeleteCategoryUseCase(
      categoryRepository,
      new CategoryDeletionService(financialItemRepository),
      new GetFamilyMembershipQuery(familyRepository),
    );

    ownerId = UserId.generate();
    memberId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    familyId = family.id;
    await familyRepository.save(family);

    category = Category.create(familyId, CategoryName.of("Alimentación"));
    category.pullDomainEvents();
    categoryRepository.add(category);
  });

  test("elimina la categoría cuando lo solicita un Owner y no tiene items", async () => {
    await useCase.execute({ familyId, requestedBy: ownerId, categoryId: category.id });

    const persisted = await categoryRepository.findById(category.id);
    assert.equal(persisted, null);
  });

  test("rechaza si la categoría no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: CategoryId.generate(),
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si la categoría no pertenece a la familia", async () => {
    const otherFamily = Family.create(FamilyName.of("Familia González"), ownerId);
    otherFamily.pullDomainEvents();
    await familyRepository.save(otherFamily);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: otherFamily.id,
          requestedBy: ownerId,
          categoryId: category.id,
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si quien solicita no es Owner", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: memberId,
          categoryId: category.id,
        }),
      InsufficientRoleError,
    );
  });

  test("rechaza si la categoría tiene items asociados", async () => {
    const item = FinancialItem.create({
      familyId,
      recordedBy: ownerId,
      amount: Money.of(5000, "CLP"),
      category: CategoryAssignment.of(category.id),
      title: Title.of("Compra de alimentos"),
      occurredOn: TransactionDate.of(new Date("2026-08-01")),
    });
    await financialItemRepository.save(item);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: category.id,
        }),
      CategoryHasAssociatedItemsError,
    );
  });

  test("no elimina la categoría si tiene items asociados", async () => {
    const item = FinancialItem.create({
      familyId,
      recordedBy: ownerId,
      amount: Money.of(5000, "CLP"),
      category: CategoryAssignment.of(category.id),
      title: Title.of("Compra de alimentos"),
      occurredOn: TransactionDate.of(new Date("2026-08-01")),
    });
    await financialItemRepository.save(item);

    await assert.rejects(() =>
      useCase.execute({ familyId, requestedBy: ownerId, categoryId: category.id }),
    );

    const persisted = await categoryRepository.findById(category.id);
    assert.ok(persisted !== null);
  });
});
