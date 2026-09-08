// /src/contexts/family-access/domain/repositories/invitation.repository.ts

import type { TransactionClient } from "../../../../platform/db/unit-of-work.js";
import type { Invitation } from "../entities/invitation.js";
import type { FamilyId } from "../value-objects/family-id.js";
import type { InvitationId } from "../value-objects/invitation-id.js";

interface InvitationRepository {
  save(invitation: Invitation, tx?: TransactionClient): Promise<void>;
  findById(id: InvitationId, tx?: TransactionClient): Promise<Invitation | null>;
  findByFamilyId(familyId: FamilyId, tx?: TransactionClient): Promise<Invitation[]>;
}

export type { InvitationRepository };
