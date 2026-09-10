// tests/contexts/financial-tracking/http/reclassify-financial-item.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { FinancialItem } from "../../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryAssignment } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryName } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { TagName } from "../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { Title } from "../../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { buildApp } from "../../../../src/platform/app.js";
import { Currency } from "../../../../src/shared-kernel/domain/currency.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";
import { InMemoryCategoryRepository } from "../doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "../doubles/in-memory-financial-item.repository.js";

describe("PATCH /families/:familyId/items/:itemId/category", () => {
  let app: FastifyInstance;
  let familyId: string;
  let itemId: string;
  let destinationCategoryId: string;
  let destinationTagId: string;
  let memberAuthorization: string;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const categoryRepository = new InMemoryCategoryRepository();
    const financialItemRepository = new InMemoryFinancialItemRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    await familyRepository.save(family);

    const originCategory = Category.create(
      family.id,
      FinancialItemType.Expense,
      CategoryName.of("Alimentación"),
    );
    const destinationCategory = Category.create(
      family.id,
      FinancialItemType.Expense,
      CategoryName.of("Transporte"),
    );
    destinationCategory.addTag(TagName.of("Bencina"));
    originCategory.pullDomainEvents();
    destinationCategory.pullDomainEvents();
    categoryRepository.add(originCategory);
    categoryRepository.add(destinationCategory);

    const item = FinancialItem.create(
      {
        familyId: family.id,
        recordedBy: ownerId,
        amount: Money.of(5000, Currency.default()),
        category: CategoryAssignment.of(originCategory.id),
        title: Title.of("Compra semanal"),
        occurredOn: TransactionDate.of(new Date("2026-08-01T12:00:00.000Z")),
      },
      FinancialItemType.Expense,
    );
    item.pullDomainEvents();
    await financialItemRepository.save(item);

    familyId = family.id.toString();
    itemId = item.id.toString();
    destinationCategoryId = destinationCategory.id.toString();
    destinationTagId = destinationCategory.tags[0].id.toString();
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;
    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({
        categoryRepository,
        financialItemRepository,
      }),
    });
  });

  test("reclasifica un movimiento con una categoría y tag activos", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/items/${itemId}/category`,
      headers: { authorization: memberAuthorization },
      payload: { newCategoryId: destinationCategoryId, newTagId: destinationTagId },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.categoryId, destinationCategoryId);
    assert.equal(body.tagId, destinationTagId);
  });

  test("permite reclasificar sin tag", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/items/${itemId}/category`,
      headers: { authorization: memberAuthorization },
      payload: { newCategoryId: destinationCategoryId, newTagId: null },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).tagId, null);
  });

  test("rechaza un tag que no pertenece a la nueva categoría", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/items/${itemId}/category`,
      headers: { authorization: memberAuthorization },
      payload: {
        newCategoryId: destinationCategoryId,
        newTagId: "00000000-0000-4000-8000-000000000000",
      },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(
      JSON.parse(response.body).error,
      "FINANCIAL_TRACKING.TAG_DOES_NOT_BELONG_TO_CATEGORY",
    );
  });

  test("rechaza la reclasificación sin token", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/items/${itemId}/category`,
      payload: { newCategoryId: destinationCategoryId },
    });

    assert.equal(response.statusCode, 401);
  });
});
