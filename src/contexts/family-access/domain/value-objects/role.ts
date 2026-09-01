// contexts/family-access/domain/value-objects/role.ts
enum RoleType {
  Owner = "OWNER",
  Member = "MEMBER",
}

const ROLE_HIERARCHY: Record<RoleType, number> = {
  [RoleType.Member]: 0,
  [RoleType.Owner]: 1,
};

class Role {
  private constructor(private readonly value: RoleType) {}

  static owner(): Role {
    return new Role(RoleType.Owner);
  }

  static member(): Role {
    return new Role(RoleType.Member);
  }

  isOwner(): boolean {
    return this.value === RoleType.Owner;
  }

  canRemoveMembers(): boolean {
    return this.isOwner();
  }

  canInviteMembers(): boolean {
    return this.isOwner();
  }

  satisfies(minRole: Role): boolean {
    return ROLE_HIERARCHY[this.value] >= ROLE_HIERARCHY[minRole.value];
  }

  equals(other: Role): boolean {
    return this.value === other.value;
  }
}

export { Role, RoleType };
