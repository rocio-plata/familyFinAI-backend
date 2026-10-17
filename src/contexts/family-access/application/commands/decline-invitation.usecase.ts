// src/contexts/family-access/application/commands/decline-invitation.usecase.ts
import { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import { InvitationNotForUserError } from "../../domain/errors/invitation-not-for-user.error.js";
import { InvitationNotFoundError } from "../../domain/errors/invitation-not-found.error.js";
import type { UserDirectoryPort } from "../../domain/ports/user-directory.port.js";
import type { InvitationRepository } from "../../domain/repositories/invitation.repository.js";
import type { InvitationId } from "../../domain/value-objects/invitation-id.js";

interface DeclineInvitationCommand {
  invitationId: InvitationId;
  userId: import("../../domain/value-objects/user-id.js").UserId;
}

class DeclineInvitationUseCase {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly userDirectory: UserDirectoryPort,
  ) {}

  async execute(command: DeclineInvitationCommand): Promise<void> {
    const invitation = await this.invitationRepository.findById(command.invitationId);
    if (!invitation) throw new InvitationNotFoundError(command.invitationId);
    const email = await this.userDirectory.findEmailByUserId?.(command.userId);
    if (!email) throw new InvitationNotForUserError(command.invitationId);
    invitation.decline(EmailAddress.of(email));
    await this.invitationRepository.save(invitation);
  }
}

export type { DeclineInvitationCommand };
export { DeclineInvitationUseCase };
