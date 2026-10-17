// /src/contexts/family-access/application/queries/get-family-members.query.ts

import { FamilyNotFoundError } from "../../domain/errors/family-not-found.error.js";
import type { UserDirectoryPort } from "../../domain/ports/user-directory.port.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { Role } from "../../domain/value-objects/role.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface GetFamilyMembersInput {
  familyId: FamilyId;
  requestedBy?: UserId;
  requestedByRole?: Role;
}

interface FamilyMemberDTO {
  userId: UserId;
  role: Role;
  joinedAt: Date;
  displayName: string | null;
  email?: string | null;
}

class GetFamilyMembersQuery {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly userDirectory?: UserDirectoryPort,
  ) {}

  async execute(input: GetFamilyMembersInput): Promise<FamilyMemberDTO[]> {
    const family = await this.familyRepository.findById(input.familyId);
    if (!family) throw new FamilyNotFoundError(input.familyId);

    const profiles = this.userDirectory?.findProfilesByIds
      ? await this.userDirectory.findProfilesByIds(family.members.map((member) => member.userId))
      : [];
    const profilesById = new Map(profiles.map((profile) => [profile.userId.toString(), profile]));
    const includeEmail = input.requestedByRole?.isOwner() === true;

    return family.members.map((member) => ({
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      displayName: profilesById.get(member.userId.toString())?.displayName ?? null,
      ...(includeEmail ? { email: profilesById.get(member.userId.toString())?.email ?? null } : {}),
    }));
  }
}

export type { FamilyMemberDTO };
export { GetFamilyMembersQuery };
