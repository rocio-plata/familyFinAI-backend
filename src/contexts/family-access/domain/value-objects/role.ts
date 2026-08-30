// src/contexts/family-access/domain/value-objects/role.ts
class Role {
  private constructor(private readonly value: RoleType) {}
  static owner(): Role { return new Role(RoleType.Owner); }
  static member(): Role { return new Role(RoleType.Member); }

  canRemoveMembers(): boolean { return this.value === RoleType.Owner; }
}

enum RoleType { Owner = "OWNER", Member = "MEMBER" }

export { Role };