// src/contexts/family-access/application/queries/get-my-pending-invitations.query.ts

import { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import type { UserDirectoryPort } from "../../domain/ports/user-directory.port.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { InvitationRepository } from "../../domain/repositories/invitation.repository.js";
import { InvitationStatus } from "../../domain/value-objects/invitation-status.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface MyPendingInvitationsInput {
  userId: UserId;
}

interface PendingInvitationDTO {
  id: string;
  familyId: string;
  familyName: string;
  invitedEmail: string;
  invitedBy: { userId: string; displayName: string | null };
  role: "OWNER" | "MEMBER";
  status: string;
  expiresAt: Date;
}

class GetMyPendingInvitationsQuery {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly userDirectory: UserDirectoryPort,
  ) {}

  async execute(input: MyPendingInvitationsInput): Promise<PendingInvitationDTO[]> {
    const email = await this.userDirectory.findEmailByUserId?.(input.userId);
    if (!email) return [];
    const invitations = await this.invitationRepository.findByInvitedEmail(EmailAddress.of(email));
    const pending = invitations.filter(
      (invitation) =>
        invitation.status === InvitationStatus.Pending &&
        invitation.expiresAt >= new Date() &&
        invitation.invitedEmail.toString().toLowerCase() === email.toLowerCase(),
    );
    const profiles = this.userDirectory.findProfilesByIds
      ? await this.userDirectory.findProfilesByIds(
          pending.map((invitation) => invitation.invitedBy),
        )
      : [];
    const profileById = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));

    const results: Array<PendingInvitationDTO | null> = await Promise.all(
      pending.map(async (invitation) => {
        const family = await this.familyRepository.findById(invitation.familyId);
        if (!family) return null;
        const inviter = profileById.get(invitation.invitedBy.toString());
        return {
          id: invitation.id.toString(),
          familyId: invitation.familyId.toString(),
          familyName: family.name.toString(),
          invitedEmail: invitation.invitedEmail.toString(),
          invitedBy: {
            userId: invitation.invitedBy.toString(),
            displayName: inviter?.displayName ?? null,
          },
          role: invitation.role.isOwner() ? ("OWNER" as const) : ("MEMBER" as const),
          status: invitation.status.toString(),
          expiresAt: invitation.expiresAt,
        };
      }),
    );
    return results.filter((value): value is PendingInvitationDTO => value !== null);
  }
}

export type { MyPendingInvitationsInput, PendingInvitationDTO };
export { GetMyPendingInvitationsQuery };
