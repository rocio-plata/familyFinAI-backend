// contexts/family-access/application/queries/get-family-members.query.ts

import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { Role } from "../../domain/value-objects/role.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface GetFamilyMembersInput {
  familyId: FamilyId;
}

interface FamilyMemberDTO {
  userId: UserId;
  role: Role;
  joinedAt: Date;
}

class GetFamilyMembersQuery {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(input: GetFamilyMembersInput): Promise<FamilyMemberDTO[]> {
    const family = await this.familyRepository.findById(input.familyId);
    if (!family) throw new FamilyNotFoundError(input.familyId);

    return family.members.map((member) => ({
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
    }));
  }
}

export type { FamilyMemberDTO };
export { GetFamilyMembersQuery };
