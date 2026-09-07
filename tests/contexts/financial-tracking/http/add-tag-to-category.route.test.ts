// tests/contexts/financial-tracking/http/add-tag-to-category.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";
import { InMemoryCategoryRepository } from "../doubles/in-memory-category.repository.js";

describe("POST /families/:familyId/categories/:categoryId/tags", () => {
  let app: FastifyInstance;
  let familyId: string;
  let categoryId: string;
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
      financialTracking: buildTestFinancialTrackingDependencies({ categoryRepository }),
    });
  });

  test("agrega un tag cuando lo solicita un Owner", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories/${categoryId}/tags`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "Supermercado" },
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.ok(body.id);
    assert.equal(body.name, "Supermercado");
    assert.equal(body.status, "ACTIVE");
    assert.equal(body.displayOrder, 0);
  });

  test("rechaza la creación solicitada por un Member", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories/${categoryId}/tags`,
      headers: { authorization: memberAuthorization },
      payload: { name: "Supermercado" },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza un tag duplicado", async () => {
    const firstResponse = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories/${categoryId}/tags`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "Supermercado" },
    });
    assert.equal(firstResponse.statusCode, 201);

    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories/${categoryId}/tags`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "supermercado" },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.DUPLICATE_TAG_NAME");
  });

  test("rechaza un body sin nombre", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories/${categoryId}/tags`,
      headers: { authorization: ownerAuthorization },
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });
});
