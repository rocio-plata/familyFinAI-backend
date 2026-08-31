// contexts/family-access/application/commands/accept-invitation.usecase.ts
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { InvitationRepository } from "../../domain/repositories/invitation.repository.js";
import type { EventBus } from "../../../../platform/events/event-bus.js";
import { InvitationNotFoundError } from "../../domain/errors/invitation-not-found.error.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
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
  ) {}

  async execute(command: AcceptInvitationCommand): Promise<void> {
    const invitation = await this.invitationRepository.findById(command.invitationId);
    if (!invitation) throw new InvitationNotFoundError(command.invitationId);

    invitation.accept(command.acceptingUserId);
    await this.invitationRepository.save(invitation);

    const family = await this.familyRepository.findById(invitation.familyId);
    if (!family) throw new FamilyNotFoundError(invitation.familyId);

    family.addMemberFromInvitationData(command.acceptingUserId, invitation.role);
    await this.familyRepository.save(family);

    for (const event of invitation.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }
  }
}

export { AcceptInvitationUseCase };
export type { AcceptInvitationCommand };