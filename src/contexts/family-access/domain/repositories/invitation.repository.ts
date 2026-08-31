// contexts/family-access/domain/repositories/invitation.repository.ts
import type { Invitation } from "../entities/invitation.js";
import type { FamilyId } from "../value-objects/family-id.js";
import type { InvitationId } from "../value-objects/invitation-id.js";

interface InvitationRepository {
  save(invitation: Invitation): Promise<void>;
  findById(id: InvitationId): Promise<Invitation | null>;
  findByFamilyId(familyId: FamilyId): Promise<Invitation[]>;
}

export type { InvitationRepository };
