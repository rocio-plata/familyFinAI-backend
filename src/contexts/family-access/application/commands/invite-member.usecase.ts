// contexts/family-access/application/commands/invite-member.usecase.ts

import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { Invitation } from "../../domain/entities/invitation.js";
import { AlreadyMemberError } from "../../domain/errors/already-member.error.js";
import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import type { UserDirectoryPort } from "../../domain/ports/user-directory.port.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { InvitationRepository } from "../../domain/repositories/invitation.repository.js";
import type { EmailAddress } from "../../domain/value-objects/email-address.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { Role } from "../../domain/value-objects/role.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface InviteMemberCommand {
  familyId: FamilyId;
  email: EmailAddress;
  role: Role;
  invitedBy: UserId;
}

class InviteMemberUseCase {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly userDirectory: UserDirectoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: InviteMemberCommand): Promise<Invitation> {
    const family = await this.familyRepository.findById(command.familyId);
    if (!family) throw new FamilyNotFoundError(command.familyId);

    const inviter = family.findMembership(command.invitedBy);
    if (!inviter?.role.canInviteMembers()) {
      throw new InsufficientRoleError();
    }

    const existingUserId = await this.userDirectory.findUserIdByEmail(command.email);
    if (existingUserId && family.findMembership(existingUserId) != null) {
      throw new AlreadyMemberError(command.email.toString());
    }

    const invitation = family.inviteMember(command.email, command.role);
    await this.invitationRepository.save(invitation);

    for (const event of invitation.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }

    return invitation;
  }
}

export type { InviteMemberCommand };
export { InviteMemberUseCase };
