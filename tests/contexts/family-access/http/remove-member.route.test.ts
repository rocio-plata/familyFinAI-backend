// tests/contexts/family-access/http/remove-member.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFamilyAccessDependencies } from "../build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../doubles/in-memory-family.repository.js";

describe("DELETE /families/:familyId/members/:memberId", () => {
  let app: FastifyInstance;
  let familyRepository: InMemoryFamilyRepository;
  let jwtService: FakeJwtService;

  beforeEach(() => {
    familyRepository = new InMemoryFamilyRepository();
    jwtService = new FakeJwtService();

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
    });
  });

  test("remueve a un miembro cuando quien ejecuta es Owner", async () => {
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${family.id.toString()}/members/${memberId.toString()}`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, "");
    const updatedFamily = await familyRepository.findById(family.id);
    assert.equal(updatedFamily?.findMembership(memberId), null);
  });

  test("rechaza sin token de autenticación", async () => {
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${family.id.toString()}/members/${memberId.toString()}`,
    });

    assert.equal(response.statusCode, 401);
  });

  test("rechaza con 403 si quien ejecuta no es Owner", async () => {
    const ownerId = UserId.generate();
    const nonOwnerId = UserId.generate();
    const targetId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(nonOwnerId, Role.member());
    family.addMemberFromInvitationData(targetId, Role.member());
    await familyRepository.save(family);
    const token = await jwtService.sign(nonOwnerId);

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${family.id.toString()}/members/${targetId.toString()}`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza con 403 si quien ejecuta no pertenece a la familia", async () => {
    const ownerId = UserId.generate();
    const targetId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(targetId, Role.member());
    await familyRepository.save(family);
    const outsiderId = UserId.generate();
    const token = await jwtService.sign(outsiderId);

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${family.id.toString()}/members/${targetId.toString()}`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 403);
  });

  test("devuelve 400 si se intenta remover al último Owner", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${family.id.toString()}/members/${ownerId.toString()}`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 400);
  });

  test("devuelve 404 si el miembro a remover no existe en la familia", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${family.id.toString()}/members/${UserId.generate().toString()}`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 404);
  });

  test("rechaza un identificador de miembro inválido", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${family.id.toString()}/members/no-es-un-uuid`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "FAMILY_ACCESS.INVALID_USER_ID");
  });

  test("rechaza con 403 si la familia no existe (mismo status que 'no soy miembro')", async () => {
    const token = await jwtService.sign(UserId.generate());

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${FamilyId.generate().toString()}/members/${UserId.generate().toString()}`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 403);
  });
});
