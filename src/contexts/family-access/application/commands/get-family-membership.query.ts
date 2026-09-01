// contexts/family-access/application/queries/get-family-membership.query.ts
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { Role } from "../../domain/value-objects/role.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface GetFamilyMembershipQuery_Input {
  familyId: FamilyId;
  userId: UserId;
}

interface FamilyMembership {
  familyId: FamilyId;
  userId: UserId;
  role: Role;
  joinedAt: Date;
}

class GetFamilyMembershipQuery {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(input: GetFamilyMembershipQuery_Input): Promise<FamilyMembership | null> {
    const family = await this.familyRepository.findById(input.familyId);
    if (!family) return null;

    const member = family.findMembership(input.userId);
    if (!member) return null;

    return {
      familyId: family.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }
}

export type { FamilyMembership };
export { GetFamilyMembershipQuery };
