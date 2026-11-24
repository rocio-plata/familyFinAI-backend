// tests/unit/contexts/financial-tracking/reactivate-tag.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { ReactivateTagUseCase } from "../../../../src/contexts/financial-tracking/application/commands/reactivate-tag.usecase.js";
import { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryNotFoundError } from "../../../../src/contexts/financial-tracking/domain/errors/category-not-found.error.js";
import { InsufficientRoleError } from "../../../../src/contexts/financial-tracking/domain/errors/insufficient-role.error.js";
import { TagNotFoundError } from "../../../../src/contexts/financial-tracking/domain/errors/tag-not-found.error.js";
import { TagReactivated } from "../../../../src/contexts/financial-tracking/domain/events/tag-reactivated.event.js";
import { CategoryId } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { TagId } from "../../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";
import { TagName } from "../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { TagStatus } from "../../../../src/contexts/financial-tracking/domain/value-objects/tag-status.js";
import { FakeEventBus } from "../../shared/doubles/fake-event-bus.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryCategoryRepository } from "./doubles/in-memory-category.repository.js";

describe("ReactivateTagUseCase", () => {
  let useCase: ReactivateTagUseCase;
  let categoryRepository: InMemoryCategoryRepository;
  let familyRepository: InMemoryFamilyRepository;
  let eventBus: FakeEventBus;
  let familyId: FamilyId;
  let ownerId: UserId;
  let memberId: UserId;
  let category: Category;
  let tagId: TagId;

  beforeEach(async () => {
    categoryRepository = new InMemoryCategoryRepository();
    familyRepository = new InMemoryFamilyRepository();
    eventBus = new FakeEventBus();
    useCase = new ReactivateTagUseCase(
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

    category = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Alimentación"),
    );
    category.addTag(TagName.of("Supermercado"));
    tagId = category.tags[0].id;
    category.deprecateTag(tagId);
    category.pullDomainEvents();
    categoryRepository.add(category);
  });

  test("reactiva un tag deprecado cuando lo solicita un Owner", async () => {
    const result = await useCase.execute({
      familyId,
      requestedBy: ownerId,
      categoryId: category.id,
      tagId,
    });

    assert.equal(result.tags[0].status, TagStatus.Active);
  });

  test("persiste la reactivación", async () => {
    await useCase.execute({ familyId, requestedBy: ownerId, categoryId: category.id, tagId });

    const persisted = await categoryRepository.findById(category.id);
    assert.equal(persisted?.tags[0].status, TagStatus.Active);
  });

  test("dispara TagReactivated", async () => {
    await useCase.execute({ familyId, requestedBy: ownerId, categoryId: category.id, tagId });

    assert.strictEqual(eventBus.publishedEvents.length, 1);
    assert(eventBus.publishedEvents[0] instanceof TagReactivated);
  });

  test("rechaza si la categoría no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: CategoryId.generate(),
          tagId,
        }),
      CategoryNotFoundError,
    );
  });

  test("rechaza si el tag no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy: ownerId,
          categoryId: category.id,
          tagId: TagId.generate(),
        }),
      TagNotFoundError,
    );
  });

  test("rechaza si quien solicita no es Owner", async () => {
    await assert.rejects(
      () => useCase.execute({ familyId, requestedBy: memberId, categoryId: category.id, tagId }),
      InsufficientRoleError,
    );
  });
});
