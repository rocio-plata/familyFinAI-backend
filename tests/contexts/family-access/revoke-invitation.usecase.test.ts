// tests/contexts/family-access/revoke-invitation.usecase.test.ts

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { RevokeInvitationUseCase } from "../../../src/contexts/family-access/application/commands/revoke-invitation.usecase.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { InsufficientRoleError } from "../../../src/contexts/family-access/domain/errors/insufficient-role.error.js";
import { InvitationNotFoundError } from "../../../src/contexts/family-access/domain/errors/invitation-not-found.error.js";
import { InvitationNotPendingError } from "../../../src/contexts/family-access/domain/errors/invitation-not-pending.error.js";
import { EmailAddress } from "../../../src/contexts/family-access/domain/value-objects/email-address.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { InvitationId } from "../../../src/contexts/family-access/domain/value-objects/invitation-id.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";
import { InMemoryInvitationRepository } from "./doubles/in-memory-invitation.repository.js";
import { createPendingInvitation } from "./helpers/create-pending-invitation.js";

describe("RevokeInvitationUseCase", () => {
  let familyRepository: InMemoryFamilyRepository;
  let invitationRepository: InMemoryInvitationRepository;
  let useCase: RevokeInvitationUseCase;
  let ownerId: UserId;
  let family: Family;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    invitationRepository = new InMemoryInvitationRepository();
    useCase = new RevokeInvitationUseCase(familyRepository, invitationRepository);

    ownerId = UserId.generate();
    family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.pullDomainEvents();
    await familyRepository.save(family);
  });

  test("revoca una invitación pendiente cuando quien ejecuta tiene permisos", async () => {
    const invitation = createPendingInvitation(
      family,
      EmailAddress.of("nuevo@ejemplo.com"),
      Role.member(),
    );
    await invitationRepository.save(invitation);

    await useCase.execute({ invitationId: invitation.id, revokedBy: ownerId });

    const updated = await invitationRepository.findById(invitation.id);
    assert.equal(updated?.status, "REVOKED");
  });

  test("rechaza si la invitación no existe", async () => {
    await assert.rejects(
      () => useCase.execute({ invitationId: InvitationId.generate(), revokedBy: ownerId }),
      InvitationNotFoundError,
    );
  });

  test("rechaza si quien revoca no tiene permisos suficientes", async () => {
    const nonOwnerId = UserId.generate();
    family.addMemberFromInvitationData(nonOwnerId, Role.member());
    await familyRepository.save(family);
    const invitation = createPendingInvitation(
      family,
      EmailAddress.of("nuevo@ejemplo.com"),
      Role.member(),
    );
    await invitationRepository.save(invitation);

    await assert.rejects(
      () => useCase.execute({ invitationId: invitation.id, revokedBy: nonOwnerId }),
      InsufficientRoleError,
    );
  });

  test("rechaza revocar una invitación que ya fue aceptada", async () => {
    const invitation = createPendingInvitation(
      family,
      EmailAddress.of("nuevo@ejemplo.com"),
      Role.member(),
    );
    invitation.accept(UserId.generate());
    await invitationRepository.save(invitation);

    await assert.rejects(
      () => useCase.execute({ invitationId: invitation.id, revokedBy: ownerId }),
      InvitationNotPendingError,
    );
  });
});
