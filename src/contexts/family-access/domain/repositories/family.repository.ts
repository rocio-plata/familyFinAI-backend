// contexts/family-access/domain/repositories/family.repository.ts
import type { Family } from "../entities/family.js";
import type { FamilyId } from "../value-objects/family-id.js";

interface FamilyRepository {
  save(family: Family): Promise<void>;
  findById(id: FamilyId): Promise<Family | null>;
}

export type { FamilyRepository };
