// tests/contexts/family-access/http/accept-invitation.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { Invitation } from "../../../../src/contexts/family-access/domain/entities/invitation.js";
import { EmailAddress } from "../../../../src/contexts/family-access/domain/value-objects/email-address.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { InvitationId } from "../../../../src/contexts/family-access/domain/value-objects/invitation-id.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { FakeUserDirectory } from "../doubles/fake-user-directory.js";
import { InMemoryFamilyRepository } from "../doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../doubles/in-memory-invitation.repository.js";

describe("POST /invitations/:invitationId/accept", () => {
  let app: FastifyInstance;
  let familyRepository: InMemoryFamilyRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let jwtService: FakeJwtService;

  beforeEach(() => {
    familyRepository = new InMemoryFamilyRepository();
    invitationRepository = new InMemoryInvitationRepository();
    jwtService = new FakeJwtService();

    app = buildApp({
      jwtService,
      familyAccess: {
        familyRepository,
        invitationRepository,
        userDirectory: new FakeUserDirectory(),
        eventBus: new FakeEventBus(),
      },
    });
  });

  test("acepta la invitación y agrega al usuario a la familia", async () => {
    const ownerId = UserId.generate();
    const acceptingUserId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    const invitation = Invitation.create(
      family.id,
      EmailAddress.of("invitada@example.com"),
      Role.member(),
    );
    await familyRepository.save(family);
    await invitationRepository.save(invitation);
    const token = await jwtService.sign(acceptingUserId);

    const response = await app.inject({
      method: "POST",
      url: `/invitations/${invitation.id.toString()}/accept`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, "");
    const updatedFamily = await familyRepository.findById(family.id);
    assert.ok(updatedFamily?.findMembership(acceptingUserId));
  });

  test("rechaza sin token de autenticación", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/invitations/${InvitationId.generate().toString()}/accept`,
    });

    assert.equal(response.statusCode, 401);
  });

  test("devuelve 404 si la invitación no existe", async () => {
    const token = await jwtService.sign(UserId.generate());

    const response = await app.inject({
      method: "POST",
      url: `/invitations/${InvitationId.generate().toString()}/accept`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 404);
  });

  test("rechaza un identificador de invitación inválido", async () => {
    const token = await jwtService.sign(UserId.generate());

    const response = await app.inject({
      method: "POST",
      url: "/invitations/no-es-un-uuid/accept",
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "FAMILY_ACCESS.INVALID_INVITATION_ID");
  });
});
