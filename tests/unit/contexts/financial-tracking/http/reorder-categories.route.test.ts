// tests/unit/contexts/financial-tracking/http/reorder-categories.route.test.ts
// tests/unit/contexts/financial-tracking/http/deprecate-tag.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { Category } from "../../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { buildApp } from "../../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";
import { InMemoryCategoryRepository } from "../doubles/in-memory-category.repository.js";

describe("PUT /families/:familyId/categories/order", () => {
  let app: FastifyInstance;
  let familyId: string;
  let ids: string[];
  let incomeId: string;
  let ownerAuthorization: string;
  let memberAuthorization: string;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const categoryRepository = new InMemoryCategoryRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    await familyRepository.save(family);

    const categories = ["A", "B", "C"].map((name, index) =>
      Category.create(
        family.id,
        FinancialItemType.Expense,
        CategoryName.of(name),
        undefined,
        undefined,
        index,
      ),
    );
    const income = Category.create(family.id, FinancialItemType.Income, CategoryName.of("Sueldo"));
    for (const category of [...categories, income]) categoryRepository.add(category);

    familyId = family.id.toString();
    ids = categories.map((category) => category.id.toString());
    incomeId = income.id.toString();
    ownerAuthorization = `Bearer ${await jwtService.sign(ownerId)}`;
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;
    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({ categoryRepository }),
    });
  });

  const put = (authorization: string | undefined, body: unknown) =>
    app.inject({
      method: "PUT",
      url: `/families/${familyId}/categories/order`,
      ...(authorization ? { headers: { authorization } } : {}),
      payload: body as object,
    });

  test("reordena las categorías y GET las devuelve en el nuevo orden", async () => {
    const response = await put(ownerAuthorization, {
      orderedCategoryIds: [ids[2], ids[0], ids[1]],
    });
    assert.equal(response.statusCode, 204);

    const list = await app.inject({
      method: "GET",
      url: `/families/${familyId}/categories?type=EXPENSE`,
      headers: { authorization: ownerAuthorization },
    });
    const body = JSON.parse(list.body);
    assert.deepEqual(
      body.map((category: { id: string }) => category.id),
      [ids[2], ids[0], ids[1]],
    );
    assert.deepEqual(
      body.map((category: { displayOrder: number }) => category.displayOrder),
      [0, 1, 2],
    );
  });

  test("responde 400 si se mezclan tipos de categoría", async () => {
    const response = await put(ownerAuthorization, { orderedCategoryIds: [ids[0], incomeId] });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.INVALID_CATEGORY_ORDER");
  });

  test("responde 400 si falta orderedCategoryIds", async () => {
    const response = await put(ownerAuthorization, {});

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });

  test("rechaza el reordenamiento solicitado por un Member", async () => {
    const response = await put(memberAuthorization, { orderedCategoryIds: [ids[0]] });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza el reordenamiento sin token", async () => {
    const response = await put(undefined, { orderedCategoryIds: [ids[0]] });

    assert.equal(response.statusCode, 401);
  });
});
