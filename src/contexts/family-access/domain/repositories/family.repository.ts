// /src/contexts/family-access/domain/repositories/family.repository.ts

import type { TransactionClient } from "../../../../platform/db/unit-of-work.js";
import type { Family } from "../entities/family.js";
import type { FamilyId } from "../value-objects/family-id.js";
import type { UserId } from "../value-objects/user-id.js";

interface FamilyRepository {
  save(family: Family, tx?: TransactionClient): Promise<void>;
  findById(id: FamilyId, tx?: TransactionClient): Promise<Family | null>;
  findAllByMemberUserId(userId: UserId, tx?: TransactionClient): Promise<Family[]>;
}

export type { FamilyRepository };
