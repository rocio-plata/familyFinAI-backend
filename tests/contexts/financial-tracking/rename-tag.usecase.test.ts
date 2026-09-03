// tests/contexts/financial-tracking/rename-tag.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { RenameTagUseCase } from "../../../src/contexts/financial-tracking/application/commands/rename-tag.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { DuplicateTagNameError } from "../../../src/contexts/financial-tracking/domain/errors/duplicate-tag-name.error.js";
import { InsufficientRoleError } from "../../../src/contexts/financial-tracking/domain/errors/insufficient-role.error.js";
import { TagNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/tag-not-found.error.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { TagId } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";
import { TagName } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("RenameTagUseCase", () => {
  let useCase: RenameTagUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let familyRepository: InMemoryFamilyRepository;
  let familyId: FamilyId;
  let ownerId: UserId;
  let memberId: UserId;
  let category: Category;
  let tagId: TagId;

  beforeEach(async () => {
    categoryRepository = new InMemoryCategoryRepository();
    familyRepository = new InMemoryFamilyRepository();
    useCase = new RenameTagUseCase(
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
    category.addTag(TagName.of("Supermercado"));
    category.pullDomainEvents();
    tagId = category.tags[0].id;
    categoryRepository.add(category);
  });

  test("renombra el tag cuando lo solicita un Owner", async () => {
    const renamed = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: category.id,
      tagId,
      newName: TagName.of("Almacén"),
    });

    assert.equal(renamed.tags[0].name.toString(), "Almacén");
  });

  test("persiste el nuevo nombre del tag", async () => {
    await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: category.id,
      tagId,
      newName: TagName.of("Almacén"),
    });

    const persisted = await categoryRepository.findById(category.id);
    assert.equal(persisted?.tags[0].name.toString(), "Almacén");
  });

  test("rechaza si la categoría no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: CategoryId.generate(),
          tagId,
          newName: TagName.of("Almacén"),
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
          tagId,
          newName: TagName.of("Almacén"),
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si el tag no existe en la categoría", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: category.id,
          tagId: TagId.generate(),
          newName: TagName.of("Almacén"),
        }),
      TagNotFoundError,
    );
  });

  test("rechaza si otro tag de la categoría ya tiene ese nombre", async () => {
    category.addTag(TagName.of("Verdulería"));

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: category.id,
          tagId,
          newName: TagName.of("verdulería"),
        }),
      DuplicateTagNameError,
    );
  });

  test("permite renombrar a un nombre que ya coincide con el propio (case-insensitive)", async () => {
    const renamed = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: category.id,
      tagId,
      newName: TagName.of("supermercado"),
    });

    assert.equal(renamed.tags[0].name.toString(), "supermercado");
  });

  test("rechaza si quien solicita no es Owner", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: memberId,
          categoryId: category.id,
          tagId,
          newName: TagName.of("Almacén"),
        }),
      InsufficientRoleError,
    );
  });
});
