// tests/contexts/family-access/infrastructure/persistence/in-memory-invitation.repository.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Invitation } from "../../../../../src/contexts/family-access/domain/entities/invitation.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { Role } from "../../../../../src/contexts/family-access/domain/value-objects/role.js";
import { InMemoryInvitationRepository } from "../../../../../src/contexts/family-access/infrastructure/persistence/in-memory-invitation.repository.js";
import { EmailAddress } from "../../../../../src/shared-kernel/domain/email-address.js";

describe("InMemoryInvitationRepository", () => {
  test("guarda y recupera invitaciones de una familia", async () => {
    const repository = new InMemoryInvitationRepository();
    const familyId = FamilyId.generate();
    const otherFamilyId = FamilyId.generate();
    const invitation = Invitation.create(
      familyId,
      EmailAddress.of("invitada@example.com"),
      Role.member(),
    );
    const otherInvitation = Invitation.create(
      otherFamilyId,
      EmailAddress.of("otra@example.com"),
      Role.member(),
    );

    await repository.save(invitation);
    await repository.save(otherInvitation);

    assert.equal(await repository.findById(invitation.id), invitation);
    assert.deepEqual(await repository.findByFamilyId(familyId), [invitation]);
  });
});
