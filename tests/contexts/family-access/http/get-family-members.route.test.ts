// tests/contexts/family-access/http/get-family-members.route.test.ts
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../../../../src/platform/app.js";
import { InMemoryFamilyRepository } from "../doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../doubles/in-memory-invitation.repository.js";
import { FakeUserDirectory } from "../doubles/fake-user-directory.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import type { FastifyInstance } from "fastify";

describe("GET /families/:familyId/members", () => {
  let app: FastifyInstance;
  let familyRepository: InMemoryFamilyRepository;
  let jwtService: FakeJwtService;

  beforeEach(() => {
    familyRepository = new InMemoryFamilyRepository();
    jwtService = new FakeJwtService();

    app = buildApp({
      jwtService,
      familyAccess: {
        familyRepository,
        invitationRepository: new InMemoryInvitationRepository(),
        userDirectory: new FakeUserDirectory(),
        eventBus: new FakeEventBus(),
      },
    });
  });

  test("devuelve los miembros cuando quien pregunta pertenece a la familia", async () => {
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "GET",
      url: `/families/${family.id.toString()}/members`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.length, 2);
  });

  test("rechaza con 403 si el usuario no pertenece a la familia", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);

    const outsiderId = UserId.generate();
    const token = await jwtService.sign(outsiderId);

    const response = await app.inject({
      method: "GET",
      url: `/families/${family.id.toString()}/members`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza con 401 sin token", async () => {
    const family = Family.create(FamilyName.of("Familia Pérez"), UserId.generate());
    await familyRepository.save(family);

    const response = await app.inject({
      method: "GET",
      url: `/families/${family.id.toString()}/members`,
    });

    assert.equal(response.statusCode, 401);
  });

  test("rechaza con 403 si la familia no existe (mismo status que 'no soy miembro')", async () => {
    const token = await jwtService.sign(UserId.generate());

    const response = await app.inject({
      method: "GET",
      url: `/families/${FamilyId.generate().toString()}/members`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 403);
  });
});