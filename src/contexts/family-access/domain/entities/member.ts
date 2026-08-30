// src/contexts/family-access/domain/entities/member.ts

class Member {
  private constructor(
    private readonly userId: UserId,      // referencia al usuario autenticado (identidad, probablemente gestionada aparte)
    private role: Role,
    private readonly joinedAt: Date,
  ) {}

  static createOwner(userId: UserId): Member {
    return new Member(userId, Role.Owner, new Date());
  }
}

export { Member };