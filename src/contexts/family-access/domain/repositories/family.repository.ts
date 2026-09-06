// /src/contexts/family-access/domain/repositories/family.repository.ts
import type { Family } from "../entities/family.js";
import type { FamilyId } from "../value-objects/family-id.js";
import type { UserId } from "../value-objects/user-id.js";

interface FamilyRepository {
  save(family: Family): Promise<void>;
  findById(id: FamilyId): Promise<Family | null>;
  findAllByMemberUserId(userId: UserId): Promise<Family[]>;
}

export type { FamilyRepository };
