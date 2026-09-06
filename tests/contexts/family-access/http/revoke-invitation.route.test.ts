// tests/contexts/family-access/http/revoke-invitation.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { Invitation } from "../../../../src/contexts/family-access/domain/entities/invitation.js";
import { EmailAddress } from "../../../../src/contexts/family-access/domain/value-objects/email-address.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { InvitationId } from "../../../../src/contexts/family-access/domain/value-objects/invitation-id.js";
import { InvitationStatus } from "../../../../src/contexts/family-access/domain/value-objects/invitation-status.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { buildApp } from "../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { FakeUserDirectory } from "../doubles/fake-user-directory.js";
import { InMemoryFamilyRepository } from "../doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../doubles/in-memory-invitation.repository.js";

describe("DELETE /invitations/:invitationId", () => {
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

  test("revoca una invitación cuando quien la solicita es Owner", async () => {
    const { invitation, ownerId } = await createPendingInvitation();
    const token = await jwtService.sign(ownerId);

    const response = await app.inject({
      method: "DELETE",
      url: `/invitations/${invitation.id.toString()}`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.body, "");
    const updatedInvitation = await invitationRepository.findById(invitation.id);
    assert.equal(updatedInvitation?.status, InvitationStatus.Revoked);
  });

  test("rechaza sin token de autenticación", async () => {
    const { invitation } = await createPendingInvitation();

    const response = await app.inject({
      method: "DELETE",
      url: `/invitations/${invitation.id.toString()}`,
    });

    assert.equal(response.statusCode, 401);
  });

  test("rechaza con 403 si quien la solicita no es Owner", async () => {
    const { family, invitation } = await createPendingInvitation();
    const memberId = UserId.generate();
    family.addMemberFromInvitationData(memberId, Role.member());
    await familyRepository.save(family);
    const token = await jwtService.sign(memberId);

    const response = await app.inject({
      method: "DELETE",
      url: `/invitations/${invitation.id.toString()}`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 403);
  });

  test("devuelve 404 si la invitación no existe", async () => {
    const token = await jwtService.sign(UserId.generate());

    const response = await app.inject({
      method: "DELETE",
      url: `/invitations/${InvitationId.generate().toString()}`,
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 404);
  });

  test("rechaza un identificador de invitación inválido", async () => {
    const token = await jwtService.sign(UserId.generate());

    const response = await app.inject({
      method: "DELETE",
      url: "/invitations/no-es-un-uuid",
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "FAMILY_ACCESS.INVALID_INVITATION_ID");
  });

  async function createPendingInvitation(): Promise<{
    family: Family;
    invitation: Invitation;
    ownerId: UserId;
  }> {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    const invitation = Invitation.create(
      family.id,
      EmailAddress.of("invitada@example.com"),
      Role.member(),
    );
    await familyRepository.save(family);
    await invitationRepository.save(invitation);

    return { family, invitation, ownerId };
  }
});
