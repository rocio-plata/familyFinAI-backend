// tests/contexts/financial-tracking/http/get-categories.route.test.ts
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

describe("GET /families/:familyId/categories", () => {
  let app: FastifyInstance;
  let familyId: string;
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
    familyId = family.id.toString();
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;

    const activeCategory = Category.create(family.id, CategoryName.of("Alimentación"));
    activeCategory.addTag(TagName.of("Verdulería"));
    categoryRepository.add(activeCategory);

    const deprecatedCategory = Category.create(family.id, CategoryName.of("Transporte"));
    deprecatedCategory.deprecate();
    categoryRepository.add(deprecatedCategory);

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({ categoryRepository }),
    });
  });

  test("devuelve las categorías activas de una familia para uno de sus miembros", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/categories`,
      headers: { authorization: memberAuthorization },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.length, 1);
    assert.equal(body[0].name, "Alimentación");
    assert.equal(body[0].status, "ACTIVE");
    assert.equal(body[0].tags[0].name, "Verdulería");
  });

  test("incluye categorías deprecadas cuando includeDeprecated es true", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/categories?includeDeprecated=true`,
      headers: { authorization: memberAuthorization },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).length, 2);
  });

  test("rechaza a quien no pertenece a la familia", async () => {
    const jwtService = new FakeJwtService();
    const outsiderAuthorization = `Bearer ${await jwtService.sign(UserId.generate())}`;
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/categories`,
      headers: { authorization: outsiderAuthorization },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza la consulta sin token", async () => {
    const response = await app.inject({ method: "GET", url: `/families/${familyId}/categories` });

    assert.equal(response.statusCode, 401);
  });
});
