// /src/contexts/family-access/infrastructure/persistence/in-memory-family.repository.ts

import type { Family } from "../../domain/entities/family.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

class InMemoryFamilyRepository implements FamilyRepository {
  private readonly families = new Map<string, Family>();

  async save(family: Family): Promise<void> {
    this.families.set(family.id.toString(), family);
  }

  async findById(id: FamilyId): Promise<Family | null> {
    return this.families.get(id.toString()) ?? null;
  }

  async findAllByMemberUserId(userId: UserId): Promise<Family[]> {
    return [...this.families.values()].filter((family) => family.findMembership(userId) !== null);
  }
}

export { InMemoryFamilyRepository };
