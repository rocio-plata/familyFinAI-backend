// tests/unit/contexts/family-access/get-invitations.query.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GetFamilyInvitationsQuery } from "../../../../src/contexts/family-access/application/queries/get-family-invitations.query.js";
import { GetMyPendingInvitationsQuery } from "../../../../src/contexts/family-access/application/queries/get-my-pending-invitations.query.js";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { Invitation } from "../../../../src/contexts/family-access/domain/entities/invitation.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { EmailAddress } from "../../../../src/shared-kernel/domain/email-address.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "./doubles/in-memory-invitation.repository.js";

describe("Queries de invitaciones", () => {
  test("devuelve solo invitaciones pendientes dirigidas al usuario autenticado", async () => {
    const familyRepository = new InMemoryFamilyRepository();
    const invitationRepository = new InMemoryInvitationRepository();
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia"), ownerId);
    await familyRepository.save(family);
    const invitation = Invitation.create(
      family.id,
      EmailAddress.of("USER@example.com"),
      Role.member(),
      ownerId,
    );
    await invitationRepository.save(invitation);
    const userDirectory = {
      findUserIdByEmail: async () => null,
      findEmailByUserId: async () => "user@example.com",
      findProfilesByIds: async () => [
        { userId: ownerId, displayName: "Owner", email: "owner@example.com" },
      ],
    };
    const query = new GetMyPendingInvitationsQuery(
      familyRepository,
      invitationRepository,
      userDirectory,
    );

    const result = await query.execute({ userId: UserId.generate() });

    assert.equal(result.length, 1);
    assert.equal(result[0]?.familyName, "Familia");
    assert.equal(result[0]?.invitedBy.displayName, "Owner");
  });

  test("filtra el listado familiar por estado", async () => {
    const familyRepository = new InMemoryFamilyRepository();
    const invitationRepository = new InMemoryInvitationRepository();
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia"), ownerId);
    await familyRepository.save(family);
    const invitation = Invitation.create(
      family.id,
      EmailAddress.of("user@example.com"),
      Role.member(),
      ownerId,
    );
    await invitationRepository.save(invitation);
    invitation.revoke();
    await invitationRepository.save(invitation);
    const query = new GetFamilyInvitationsQuery(familyRepository, invitationRepository);

    assert.equal((await query.execute({ familyId: family.id })).length, 0);
    assert.equal((await query.execute({ familyId: family.id, status: "ALL" })).length, 1);
  });
});
