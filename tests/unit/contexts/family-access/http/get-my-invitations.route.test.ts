// tests/unit/contexts/family-access/http/get-my-invitations.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../../src/contexts/family-access/domain/entities/family.js";
import { Invitation } from "../../../../../src/contexts/family-access/domain/entities/invitation.js";
import { FamilyName } from "../../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { EmailAddress } from "../../../../../src/shared-kernel/domain/email-address.js";
import { buildApp } from "../../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFamilyAccessDependencies } from "../build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "../doubles/in-memory-invitation.repository.js";

describe("GET /me/invitations", () => {
  let app: FastifyInstance;
  let authorization: string;
  let invitation: Invitation;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const userId = UserId.generate();
    const ownerId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const invitationRepository = new InMemoryInvitationRepository();
    const family = Family.create(FamilyName.of("Familia Gómez"), ownerId);
    invitation = Invitation.create(
      family.id,
      EmailAddress.of("persona@example.com"),
      Role.member(),
      ownerId,
    );
    await familyRepository.save(family);
    await invitationRepository.save(invitation);

    authorization = `Bearer ${await jwtService.sign(userId)}`;
    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({
        familyRepository,
        invitationRepository,
        userDirectory: {
          findUserIdByEmail: async () => null,
          findEmailByUserId: async () => "PERSONA@example.com",
          findProfilesByIds: async () => [
            { userId: ownerId, displayName: "Rocío", email: "rocio@example.com" },
          ],
        },
      }),
    });
  });

  test("devuelve la invitación pendiente con el email del destinatario", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/me/invitations",
      headers: { authorization },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), [
      {
        id: invitation.id.toString(),
        familyId: invitation.familyId.toString(),
        familyName: "Familia Gómez",
        invitedEmail: "persona@example.com",
        invitedBy: { userId: invitation.invitedBy.toString(), displayName: "Rocío" },
        role: "MEMBER",
        status: "PENDING",
        expiresAt: invitation.expiresAt.toISOString(),
      },
    ]);
  });

  test("responde 401 tipado sin token", async () => {
    const response = await app.inject({ method: "GET", url: "/me/invitations" });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(JSON.parse(response.body), {
      error: "AUTH.MISSING_TOKEN",
      message: "Falta el token de autenticación",
    });
  });

  test("responde 401 tipado con un token inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/me/invitations",
      headers: { authorization: "Bearer invalid-token" },
    });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(JSON.parse(response.body), {
      error: "AUTH.INVALID_TOKEN",
      message: "Token inválido o expirado",
    });
  });
});
