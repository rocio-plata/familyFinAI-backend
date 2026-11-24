// tests/unit/contexts/financial-tracking/reorder-categories.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { ReorderCategoriesUseCase } from "../../../../src/contexts/financial-tracking/application/commands/reorder-categories.usecase.js";
import { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryNotFoundError } from "../../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { InsufficientRoleError } from "../../../../src/contexts/financial-tracking/domain/errors/insufficient-role.error.js";
import { InvalidCategoryOrderError } from "../../../../src/contexts/financial-tracking/domain/errors/invalid-category-order.error.js";
import { CategoryId } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("ReorderCategoriesUseCase", () => {
  let useCase: ReorderCategoriesUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let familyRepository: InMemoryFamilyRepository;
  let familyId: FamilyId;
  let ownerId: UserId;
  let memberId: UserId;
  let a: Category;
  let b: Category;
  let c: Category;
  let income: Category;

  const make = (type: FinancialItemType, name: string, order: number) =>
    Category.create(familyId, type, CategoryName.of(name), undefined, undefined, order);

  beforeEach(async () => {
    categoryRepository = new InMemoryCategoryRepository();
    familyRepository = new InMemoryFamilyRepository();
    useCase = new ReorderCategoriesUseCase(
      categoryRepository,
      new GetFamilyMembershipQuery(familyRepository),
    );

    ownerId = UserId.generate();
    memberId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    familyId = family.id;
    await familyRepository.save(family);

    a = make(FinancialItemType.Expense, "A", 0);
    b = make(FinancialItemType.Expense, "B", 1);
    c = make(FinancialItemType.Expense, "C", 2);
    income = make(FinancialItemType.Income, "Sueldo", 0);
    for (const category of [a, b, c, income]) categoryRepository.add(category);
  });

  const orderOf = async (category: Category) =>
    (await categoryRepository.findById(category.id))?.displayOrder;

  test("reasigna displayOrder según la posición recibida", async () => {
    await useCase.execute({
      familyId,
      requestedBy: ownerId,
      orderedCategoryIds: [c.id, a.id, b.id],
    });

    assert.equal(await orderOf(c), 0);
    assert.equal(await orderOf(a), 1);
    assert.equal(await orderOf(b), 2);
  });

  test("las categorías no incluidas del mismo tipo quedan después, en su orden previo", async () => {
    await useCase.execute({ familyId, requestedBy: ownerId, orderedCategoryIds: [c.id] });

    assert.equal(await orderOf(c), 0);
    assert.equal(await orderOf(a), 1);
    assert.equal(await orderOf(b), 2);
  });

  test("no altera las categorías de otro tipo", async () => {
    await useCase.execute({ familyId, requestedBy: ownerId, orderedCategoryIds: [b.id, a.id] });

    assert.equal(await orderOf(income), 0);
  });

  test("rechaza ids duplicados", async () => {
    await assert.rejects(
      () => useCase.execute({ familyId, requestedBy: ownerId, orderedCategoryIds: [a.id, a.id] }),
      InvalidCategoryOrderError,
    );
  });

  test("rechaza una lista vacía", async () => {
    await assert.rejects(
      () => useCase.execute({ familyId, requestedBy: ownerId, orderedCategoryIds: [] }),
      InvalidCategoryOrderError,
    );
  });

  test("rechaza mezclar tipos de categoría", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          orderedCategoryIds: [a.id, income.id],
        }),
      InvalidCategoryOrderError,
    );
  });

  test("rechaza una categoría inexistente o de otra familia", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          orderedCategoryIds: [a.id, CategoryId.generate()],
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si quien solicita no es Owner", async () => {
    await assert.rejects(
      () => useCase.execute({ familyId, requestedBy: memberId, orderedCategoryIds: [a.id] }),
      InsufficientRoleError,
    );
  });
});
