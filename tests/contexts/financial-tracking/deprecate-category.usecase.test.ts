// tests/contexts/financial-tracking/deprecate-category.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { DeprecateCategoryUseCase } from "../../../src/contexts/financial-tracking/application/commands/deprecate-category.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { InsufficientRoleError } from "../../../src/contexts/financial-tracking/domain/errors/insufficient-role.error.js";
import { CategoryDeprecated } from "../../../src/contexts/financial-tracking/domain/events/category-deprecated.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { CategoryStatus } from "../../../src/contexts/financial-tracking/domain/value-objects/category-status.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("DeprecateCategoryUseCase", () => {
  let useCase: DeprecateCategoryUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let familyRepository: InMemoryFamilyRepository;
  let eventBus: FakeEventBus;
  let familyId: FamilyId;
  let ownerId: UserId;
  let memberId: UserId;
  let category: Category;

  beforeEach(async () => {
    categoryRepository = new InMemoryCategoryRepository();
    familyRepository = new InMemoryFamilyRepository();
    eventBus = new FakeEventBus();
    useCase = new DeprecateCategoryUseCase(
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

    category = Category.create(familyId, CategoryName.of("Alimentación"));
    category.pullDomainEvents();
    categoryRepository.add(category);
  });

  test("deprecia la categoría cuando lo solicita un Owner", async () => {
    const deprecated = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: category.id,
    });

    assert.equal(deprecated.status, CategoryStatus.Deprecated);
  });

  test("persiste la categoría deprecada", async () => {
    await useCase.execute({ familyId, requestedBy: ownerId, categoryId: category.id });

    const persisted = await categoryRepository.findById(category.id);
    assert.equal(persisted?.status, CategoryStatus.Deprecated);
  });

  test("dispara CategoryDeprecated", async () => {
    await useCase.execute({ familyId, requestedBy: ownerId, categoryId: category.id });

    assert.strictEqual(eventBus.publishedEvents.length, 1);
    assert(eventBus.publishedEvents[0] instanceof CategoryDeprecated);
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
});
