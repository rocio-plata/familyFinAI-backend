// /src/contexts/family-access/application/queries/get-families-for-user.query.ts
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { Role } from "../../domain/value-objects/role.js";
import type { UserId } from "../../domain/value-objects/user-id.js";

interface GetFamiliesForUserInput {
  userId: UserId;
}

interface FamilyForUserDTO {
  familyId: FamilyId;
  name: string;
  role: Role;
  defaultCurrency: string;
  memberCount: number;
}

class GetFamiliesForUserQuery {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute(input: GetFamiliesForUserInput): Promise<FamilyForUserDTO[]> {
    const families = await this.familyRepository.findAllByMemberUserId(input.userId);

    return families
      .map((family) => {
        const membership = family.findMembership(input.userId);
        return {
          familyId: family.id,
          name: family.name.toString(),
          role: membership?.role as Role,
          defaultCurrency: family.defaultCurrency.toString(),
          memberCount: family.members.length,
          displayOrder: membership?.displayOrder ?? null,
          joinedAt: membership?.joinedAt as Date,
        };
      })
      .sort((a, b) => {
        if (a.displayOrder !== null && b.displayOrder !== null) {
          return a.displayOrder - b.displayOrder;
        }
        if (a.displayOrder !== null) return -1;
        if (b.displayOrder !== null) return 1;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      })
      .map(({ familyId, name, role, defaultCurrency, memberCount }) => ({
        familyId,
        name,
        role,
        defaultCurrency,
        memberCount,
      }));
  }
}

export type { FamilyForUserDTO };
export { GetFamiliesForUserQuery };
