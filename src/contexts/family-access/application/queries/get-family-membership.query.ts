// contexts/family-access/application/queries/get-family-membership.query.ts
class GetFamilyMembershipQuery {
  constructor(private readonly familyRepository: FamilyRepository) {}

  async execute({ userId, familyId }: Props): Promise<Membership | null> {
    const family = await this.familyRepository.findById(familyId);
    return family?.findMembership(userId) ?? null;   // método del propio agregado Family
  }
}

export const getFamilyMembershipQuery = new GetFamilyMembershipQuery(familyRepository);
