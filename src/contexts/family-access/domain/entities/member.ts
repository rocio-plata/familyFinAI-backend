// src/contexts/family-access/domain/entities/member.ts
import { UserId } from '../value-objects/user-id.js';
import { Role } from '../value-objects/role.js';
class Member {
  private constructor(
    private readonly userId: UserId,      // referencia al usuario autenticado (identidad, probablemente gestionada aparte)
    private role: Role,
    private readonly joinedAt: Date,
  ) {}

  static createOwner(userId: UserId): Member {
    return new Member(userId, Role.owner(), new Date());
  }
}

export { Member };