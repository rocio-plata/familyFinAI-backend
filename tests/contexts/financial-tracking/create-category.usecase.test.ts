// tests/contexts/financial-tracking/create-category.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CreateCategoryUseCase } from "../../../src/contexts/financial-tracking/application/commands/create-category.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { DuplicateCategoryNameError } from "../../../src/contexts/financial-tracking/domain/errors/duplicate-category-name.error.js";
import { InsufficientRoleError } from "../../../src/contexts/financial-tracking/domain/errors/insufficient-role.error.js";
import { CategoryCreated } from "../../../src/contexts/financial-tracking/domain/events/category-created.event.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("CreateCategoryUseCase", () => {
  let useCase: CreateCategoryUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let familyRepository: InMemoryFamilyRepository;
  let eventBus: FakeEventBus;
  let familyId: FamilyId;
  let ownerId: UserId;
  let memberId: UserId;

  beforeEach(async () => {
    categoryRepository = new InMemoryCategoryRepository();
    familyRepository = new InMemoryFamilyRepository();
    eventBus = new FakeEventBus();
    useCase = new CreateCategoryUseCase(
      categoryRepository,
      new GetFamilyMembershipQuery(familyRepository),
      eventBus,
    );

    ownerId = UserId.generate();
    memberId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    familyId = family.id;
    await familyRepository.save(family);
  });

  test("crea una categoría nueva cuando la solicita un Owner", async () => {
    const category = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      name: CategoryName.of("Alimentación"),
    });

    assert.ok(category.id);
    assert.equal(category.name.toString(), "Alimentación");
  });

  test("persiste la categoría creada", async () => {
    const category = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      name: CategoryName.of("Alimentación"),
    });

    const persisted = await categoryRepository.findById(category.id);
    assert.ok(persisted !== null);
  });

  test("dispara CategoryCreated", async () => {
    await useCase.execute({
      familyId,
      requestedBy: ownerId,
      name: CategoryName.of("Alimentación"),
    });

    assert.strictEqual(eventBus.publishedEvents.length, 1);
    assert(eventBus.publishedEvents[0] instanceof CategoryCreated);
  });

  test("rechaza un nombre duplicado (case-insensitive) en la misma familia", async () => {
    const existing = Category.create(familyId, CategoryName.of("Alimentación"));
    categoryRepository.add(existing);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          name: CategoryName.of("alimentación"),
        }),
      DuplicateCategoryNameError,
    );
  });

  test("permite el mismo nombre en familias distintas", async () => {
    const otherOwnerId = UserId.generate();
    const otherFamily = Family.create(FamilyName.of("Familia González"), otherOwnerId);
    otherFamily.pullDomainEvents();
    await familyRepository.save(otherFamily);
    const existing = Category.create(otherFamily.id, CategoryName.of("Alimentación"));
    categoryRepository.add(existing);

    const category = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      name: CategoryName.of("Alimentación"),
    });
    assert.ok(category.id);
  });

  test("rechaza el mismo nombre si la categoría existente está deprecada", async () => {
    const deprecated = Category.create(familyId, CategoryName.of("Alimentación"));
    deprecated.deprecate();
    categoryRepository.add(deprecated);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          name: CategoryName.of("Alimentación"),
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
          name: CategoryName.of("Alimentación"),
        }),
      InsufficientRoleError,
    );
  });

  test("rechaza si quien solicita no pertenece a la familia", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: UserId.generate(),
          name: CategoryName.of("Alimentación"),
        }),
      InsufficientRoleError,
    );
  });
});
