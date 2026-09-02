// tests/contexts/financial-tracking/rename-category.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { RenameCategoryUseCase } from "../../../src/contexts/financial-tracking/application/commands/rename-category.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { DuplicateCategoryNameError } from "../../../src/contexts/financial-tracking/domain/errors/duplicate-category-name.error.js";
import { InsufficientRoleError } from "../../../src/contexts/financial-tracking/domain/errors/insufficient-role.error.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("RenameCategoryUseCase", () => {
  let useCase: RenameCategoryUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let familyRepository: InMemoryFamilyRepository;
  let familyId: FamilyId;
  let ownerId: UserId;
  let memberId: UserId;
  let category: Category;

  beforeEach(async () => {
    categoryRepository = new InMemoryCategoryRepository();
    familyRepository = new InMemoryFamilyRepository();
    useCase = new RenameCategoryUseCase(
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

    category = Category.create(familyId, CategoryName.of("Alimentación"));
    category.pullDomainEvents();
    categoryRepository.add(category);
  });

  test("renombra la categoría cuando lo solicita un Owner", async () => {
    const renamed = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: category.id,
      newName: CategoryName.of("Supermercado"),
    });

    assert.equal(renamed.name.toString(), "Supermercado");
  });

  test("persiste el nuevo nombre", async () => {
    await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: category.id,
      newName: CategoryName.of("Supermercado"),
    });

    const persisted = await categoryRepository.findById(category.id);
    assert.equal(persisted?.name.toString(), "Supermercado");
  });

  test("rechaza si la categoría no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: CategoryId.generate(),
          newName: CategoryName.of("Supermercado"),
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
          newName: CategoryName.of("Supermercado"),
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si otra categoría de la familia ya tiene ese nombre", async () => {
    const other = Category.create(familyId, CategoryName.of("Transporte"));
    categoryRepository.add(other);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: category.id,
          newName: CategoryName.of("transporte"),
        }),
      DuplicateCategoryNameError,
    );
  });

  test("permite renombrar a un nombre que ya coincide con el propio (case-insensitive)", async () => {
    const renamed = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: category.id,
      newName: CategoryName.of("alimentación"),
    });

    assert.equal(renamed.name.toString(), "alimentación");
  });

  test("rechaza si otra categoría deprecada de la familia ya tiene ese nombre", async () => {
    const deprecated = Category.create(familyId, CategoryName.of("Transporte"));
    deprecated.deprecate();
    categoryRepository.add(deprecated);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: category.id,
          newName: CategoryName.of("Transporte"),
        }),
      DuplicateCategoryNameError,
    );
  });

  test("rechaza si quien solicita no es Owner", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: memberId,
          categoryId: category.id,
          newName: CategoryName.of("Supermercado"),
        }),
      InsufficientRoleError,
    );
  });
});
