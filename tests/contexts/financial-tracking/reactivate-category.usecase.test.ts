// tests/contexts/financial-tracking/reactivate-category.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { ReactivateCategoryUseCase } from "../../../src/contexts/financial-tracking/application/commands/reactivate-category.usecase.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { InsufficientRoleError } from "../../../src/contexts/financial-tracking/domain/errors/insufficient-role.error.js";
import { CategoryReactivated } from "../../../src/contexts/financial-tracking/domain/events/category-reactivated.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { CategoryStatus } from "../../../src/contexts/financial-tracking/domain/value-objects/category-status.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("ReactivateCategoryUseCase", () => {
  let useCase: ReactivateCategoryUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let familyRepository: InMemoryFamilyRepository;
  let eventBus: FakeEventBus;
  let familyId: FamilyId;
  let ownerId: UserId;
  let memberId: UserId;
  let deprecatedCategory: Category;

  beforeEach(async () => {
    categoryRepository = new InMemoryCategoryRepository();
    familyRepository = new InMemoryFamilyRepository();
    eventBus = new FakeEventBus();
    useCase = new ReactivateCategoryUseCase(
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

    deprecatedCategory = Category.create(familyId, CategoryName.of("Alimentación"));
    deprecatedCategory.deprecate();
    deprecatedCategory.pullDomainEvents();
    categoryRepository.add(deprecatedCategory);
  });

  test("reactiva una categoría deprecada cuando lo solicita un Owner", async () => {
    const category = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: deprecatedCategory.id,
    });

    assert.equal(category.status, CategoryStatus.Active);
  });

  test("persiste la reactivación", async () => {
    await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: deprecatedCategory.id,
    });

    const persisted = await categoryRepository.findById(deprecatedCategory.id);
    assert.equal(persisted?.status, CategoryStatus.Active);
  });

  test("dispara CategoryReactivated", async () => {
    await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: deprecatedCategory.id,
    });

    assert.strictEqual(eventBus.publishedEvents.length, 1);
    assert(eventBus.publishedEvents[0] instanceof CategoryReactivated);
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
          categoryId: deprecatedCategory.id,
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
          categoryId: deprecatedCategory.id,
        }),
      InsufficientRoleError,
    );
  });
});
