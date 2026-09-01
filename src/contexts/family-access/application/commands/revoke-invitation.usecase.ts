// contexts/family-access/application/commands/revoke-invitation.usecase.ts

import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import { InvitationNotFoundError } from "../../domain/errors/invitation-not-found.error.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { InvitationRepository } from "../../domain/repositories/invitation.repository.js";
import type { InvitationId } from "../../domain/value-objects/invitation-id.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface RevokeInvitationCommand {
  invitationId: InvitationId;
  revokedBy: UserId;
}

class RevokeInvitationUseCase {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly invitationRepository: InvitationRepository,
  ) {}

  async execute(command: RevokeInvitationCommand): Promise<void> {
    const invitation = await this.invitationRepository.findById(command.invitationId);
    if (!invitation) throw new InvitationNotFoundError(command.invitationId);

    const family = await this.familyRepository.findById(invitation.familyId);
    if (!family) throw new FamilyNotFoundError(invitation.familyId);

    const revoker = family.findMembership(command.revokedBy);
    if (!revoker?.role.canInviteMembers()) {
      throw new InsufficientRoleError();
    }

    invitation.revoke();
    await this.invitationRepository.save(invitation);
  }
}

export type { RevokeInvitationCommand };
export { RevokeInvitationUseCase };
