// tests/contexts/financial-tracking/http/delete-category.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { FinancialItem } from "../../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryAssignment } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { CategoryName } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { Money } from "../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Title } from "../../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { InMemoryCategoryRepository } from "../doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "../doubles/in-memory-financial-item.repository.js";

describe("DELETE /families/:familyId/categories/:categoryId", () => {
  let app: FastifyInstance;
  let familyId: string;
  let categoryId: string;
  let ownerId: UserId;
  let ownerAuthorization: string;
  let memberAuthorization: string;
  let financialItemRepository: InMemoryFinancialItemRepository;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    ownerId = UserId.generate();
    const memberId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const categoryRepository = new InMemoryCategoryRepository();
    financialItemRepository = new InMemoryFinancialItemRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    await familyRepository.save(family);

    const category = Category.create(family.id, CategoryName.of("Alimentación"));
    category.pullDomainEvents();
    categoryRepository.add(category);

    familyId = family.id.toString();
    categoryId = category.id.toString();
    ownerAuthorization = `Bearer ${await jwtService.sign(ownerId)}`;
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;
    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: {
        categoryRepository,
        financialItemRepository,
        eventBus: new FakeEventBus(),
      },
    });
  });

  test("elimina una categoría sin items cuando lo solicita un Owner", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId}/categories/${categoryId}`,
      headers: { authorization: ownerAuthorization },
    });
    assert.equal(response.statusCode, 204);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: `/families/${familyId}/categories?includeDeprecated=true`,
      headers: { authorization: ownerAuthorization },
    });
    assert.deepEqual(JSON.parse(categoriesResponse.body), []);
  });

  test("rechaza la eliminación solicitada por un Member", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId}/categories/${categoryId}`,
      headers: { authorization: memberAuthorization },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza eliminar una categoría con items asociados", async () => {
    await financialItemRepository.save(
      FinancialItem.create({
        familyId: FamilyId.of(familyId),
        recordedBy: ownerId,
        amount: Money.of(5000, "CLP"),
        category: CategoryAssignment.of(CategoryId.of(categoryId)),
        title: Title.of("Compra"),
        occurredOn: TransactionDate.of(new Date("2026-08-01")),
      }),
    );

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId}/categories/${categoryId}`,
      headers: { authorization: ownerAuthorization },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(
      JSON.parse(response.body).error,
      "FINANCIAL_TRACKING.CATEGORY_HAS_ASSOCIATED_ITEMS",
    );
  });

  test("rechaza la eliminación sin token", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId}/categories/${categoryId}`,
    });

    assert.equal(response.statusCode, 401);
  });
});
