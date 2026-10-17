// /src/contexts/family-access/application/commands/accept-invitation.usecase.ts

import type { UnitOfWork } from "../../../../platform/db/unit-of-work.js";
import { DirectUnitOfWork } from "../../../../platform/db/unit-of-work.js";
import type { EventBus } from "../../../../platform/events/event-bus.js";
import { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import { InvitationNotForUserError } from "../../domain/errors/invitation-not-for-user.error.js";
import { InvitationNotFoundError } from "../../domain/errors/invitation-not-found.error.js";
import type { UserDirectoryPort } from "../../domain/ports/user-directory.port.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { InvitationRepository } from "../../domain/repositories/invitation.repository.js";
import type { InvitationId } from "../../domain/value-objects/invitation-id.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface AcceptInvitationCommand {
  invitationId: InvitationId;
  acceptingUserId: UserId;
}

class AcceptInvitationUseCase {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly eventBus: EventBus,
    private readonly unitOfWork: UnitOfWork = new DirectUnitOfWork(),
    private readonly userDirectory?: UserDirectoryPort,
  ) {}

  async execute(command: AcceptInvitationCommand): Promise<void> {
    const invitationEvents = await this.unitOfWork.run(async (tx) => {
      const invitation = await this.invitationRepository.findById(command.invitationId, tx);
      if (!invitation) throw new InvitationNotFoundError(command.invitationId);

      if (this.userDirectory?.findEmailByUserId) {
        const email = await this.userDirectory.findEmailByUserId(command.acceptingUserId);
        if (!email || !invitation.invitedEmail.equals(EmailAddress.of(email))) {
          throw new InvitationNotForUserError(command.invitationId);
        }
      }

      invitation.accept(command.acceptingUserId);

      const family = await this.familyRepository.findById(invitation.familyId, tx);
      if (!family) throw new FamilyNotFoundError(invitation.familyId);

      family.addMemberFromInvitationData(command.acceptingUserId, invitation.role);
      await this.invitationRepository.save(invitation, tx);
      await this.familyRepository.save(family, tx);

      return invitation.pullDomainEvents();
    });

    for (const event of invitationEvents) {
      await this.eventBus.publish(event);
    }
  }
}

export type { AcceptInvitationCommand };
export { AcceptInvitationUseCase };
