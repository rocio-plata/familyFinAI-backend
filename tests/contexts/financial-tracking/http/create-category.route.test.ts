// tests/contexts/financial-tracking/http/create-category.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";

describe("POST /families/:familyId/categories", () => {
  let app: FastifyInstance;
  let familyId: string;
  let ownerAuthorization: string;
  let memberAuthorization: string;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    await familyRepository.save(family);
    familyId = family.id.toString();
    ownerAuthorization = `Bearer ${await jwtService.sign(ownerId)}`;
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies(),
    });
  });

  test("crea una categoría cuando la solicita un Owner", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "Alimentación" },
    });

    assert.equal(response.statusCode, 201);
    const body = JSON.parse(response.body);
    assert.ok(body.id);
    assert.equal(body.name, "Alimentación");
    assert.equal(body.status, "ACTIVE");
  });

  test("rechaza la creación solicitada por un Member", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories`,
      headers: { authorization: memberAuthorization },
      payload: { name: "Alimentación" },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza un nombre de categoría duplicado", async () => {
    const firstResponse = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "Alimentación" },
    });
    assert.equal(firstResponse.statusCode, 201);

    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "alimentación" },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.DUPLICATE_CATEGORY_NAME");
  });

  test("rechaza un body sin nombre", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/categories`,
      headers: { authorization: ownerAuthorization },
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });
});
