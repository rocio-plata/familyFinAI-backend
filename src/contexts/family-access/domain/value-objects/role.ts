// contexts/family-access/domain/value-objects/role.ts
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

  equals(other: Role): boolean {
    return this.value === other.value;
  }
}

enum RoleType {
  Owner = "OWNER",
  Member = "MEMBER",
}

export { Role, RoleType };
