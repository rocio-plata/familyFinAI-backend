// src/contexts/family-access/application/queries/get-family-invitations.query.ts
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { InvitationRepository } from "../../domain/repositories/invitation.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import { InvitationStatus } from "../../domain/value-objects/invitation-status.js";

interface GetFamilyInvitationsInput {
  familyId: FamilyId;
  status?: "PENDING" | "ALL";
}

interface FamilyInvitationDTO {
  id: string;
  familyId: string;
  invitedEmail: string;
  invitedBy: string;
  role: "OWNER" | "MEMBER";
  status: string;
  expiresAt: Date;
}

class GetFamilyInvitationsQuery {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly invitationRepository: InvitationRepository,
  ) {}

  async execute(input: GetFamilyInvitationsInput): Promise<FamilyInvitationDTO[]> {
    const family = await this.familyRepository.findById(input.familyId);
    if (!family) return [];
    const invitations = await this.invitationRepository.findByFamilyId(input.familyId);
    return invitations
      .filter(
        (invitation) => input.status === "ALL" || invitation.status === InvitationStatus.Pending,
      )
      .map((invitation) => ({
        id: invitation.id.toString(),
        familyId: invitation.familyId.toString(),
        invitedEmail: invitation.invitedEmail.toString(),
        invitedBy: invitation.invitedBy.toString(),
        role: invitation.role.isOwner() ? "OWNER" : "MEMBER",
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      }));
  }
}

export type { FamilyInvitationDTO, GetFamilyInvitationsInput };
export { GetFamilyInvitationsQuery };
