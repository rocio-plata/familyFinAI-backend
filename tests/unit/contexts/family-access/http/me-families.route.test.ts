// tests/contexts/family-access/http/me-families.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFamilyAccessDependencies } from "../build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../doubles/in-memory-family.repository.js";

describe("rutas de mis familias", () => {
  let app: FastifyInstance;
  let familyRepository: InMemoryFamilyRepository;
  let authorization: string;
  let firstFamily: Family;
  let secondFamily: Family;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const userId = UserId.generate();
    authorization = `Bearer ${await jwtService.sign(userId)}`;
    familyRepository = new InMemoryFamilyRepository();

    firstFamily = Family.create(FamilyName.of("Primera familia"), userId);
    secondFamily = Family.create(FamilyName.of("Segunda familia"), userId);
    firstFamily.setMemberDisplayOrder(userId, 1);
    secondFamily.setMemberDisplayOrder(userId, 0);
    await familyRepository.save(firstFamily);
    await familyRepository.save(secondFamily);

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
    });
  });

  test("devuelve las familias del usuario ya ordenadas", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/me/families",
      headers: { authorization },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.deepEqual(
      body.map((family: { familyId: string }) => family.familyId),
      [secondFamily.id.toString(), firstFamily.id.toString()],
    );
    assert.equal(body[0].role, "OWNER");
  });

  test("rechaza consultar las familias sin token", async () => {
    const response = await app.inject({ method: "GET", url: "/me/families" });

    assert.equal(response.statusCode, 401);
  });

  test("reordena todas las familias del usuario", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/me/families/order",
      headers: { authorization },
      payload: { orderedFamilyIds: [firstFamily.id.toString(), secondFamily.id.toString()] },
    });
    assert.equal(response.statusCode, 204);

    const familiesResponse = await app.inject({
      method: "GET",
      url: "/me/families",
      headers: { authorization },
    });
    const body = JSON.parse(familiesResponse.body);
    assert.deepEqual(
      body.map((family: { familyId: string }) => family.familyId),
      [firstFamily.id.toString(), secondFamily.id.toString()],
    );
  });

  test("rechaza un orden que no contiene todas las familias reales", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/me/families/order",
      headers: { authorization },
      payload: { orderedFamilyIds: [firstFamily.id.toString()] },
    });

    assert.equal(response.statusCode, 400);
  });

  test("rechaza un body sin orderedFamilyIds", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/me/families/order",
      headers: { authorization },
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });
});
