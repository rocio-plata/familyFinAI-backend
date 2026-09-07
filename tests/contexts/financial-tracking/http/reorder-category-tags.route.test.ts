// tests/contexts/financial-tracking/http/reorder-category-tags.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { TagName } from "../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";
import { InMemoryCategoryRepository } from "../doubles/in-memory-category.repository.js";

describe("PUT /families/:familyId/categories/:categoryId/tags/order", () => {
  let app: FastifyInstance;
  let familyId: string;
  let categoryId: string;
  let firstTagId: string;
  let secondTagId: string;
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

    const category = Category.create(family.id, CategoryName.of("Alimentación"));
    category.addTag(TagName.of("Supermercado"));
    category.addTag(TagName.of("Farmacia"));
    category.pullDomainEvents();
    categoryRepository.add(category);

    familyId = family.id.toString();
    categoryId = category.id.toString();
    firstTagId = category.tags[0].id.toString();
    secondTagId = category.tags[1].id.toString();
    ownerAuthorization = `Bearer ${await jwtService.sign(ownerId)}`;
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;
    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({ categoryRepository }),
    });
  });

  test("reordena los tags cuando lo solicita un Owner", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/families/${familyId}/categories/${categoryId}/tags/order`,
      headers: { authorization: ownerAuthorization },
      payload: { orderedTagIds: [secondTagId, firstTagId] },
    });

    assert.equal(response.statusCode, 204);

    const categoriesResponse = await app.inject({
      method: "GET",
      url: `/families/${familyId}/categories`,
      headers: { authorization: ownerAuthorization },
    });
    const [category] = JSON.parse(categoriesResponse.body);
    assert.deepEqual(
      category.tags.map((tag: { id: string }) => tag.id),
      [secondTagId, firstTagId],
    );
  });

  test("rechaza el reordenamiento solicitado por un Member", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/families/${familyId}/categories/${categoryId}/tags/order`,
      headers: { authorization: memberAuthorization },
      payload: { orderedTagIds: [secondTagId, firstTagId] },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza un orden que no contiene todos los tags", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/families/${familyId}/categories/${categoryId}/tags/order`,
      headers: { authorization: ownerAuthorization },
      payload: { orderedTagIds: [firstTagId] },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.INVALID_TAG_ORDER");
  });

  test("rechaza un body sin orderedTagIds", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/families/${familyId}/categories/${categoryId}/tags/order`,
      headers: { authorization: ownerAuthorization },
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });
});
