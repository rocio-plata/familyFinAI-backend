// src/contexts/family-access/domain/entities/member.ts

import { Role } from "../value-objects/role.js";
import type { UserId } from "../value-objects/user-id.js";

class Member {
  private constructor(
    private readonly _userId: UserId,
    private _role: Role,
    private readonly _joinedAt: Date,
  ) {}

  get userId(): UserId {
    return this._userId;
  }
  get role(): Role {
    return this._role;
  }
  get joinedAt(): Date {
    return this._joinedAt;
  }

  static createOwner(userId: UserId): Member {
    return new Member(userId, Role.owner(), new Date());
  }

  static create(userId: UserId, role: Role): Member {
    return new Member(userId, role, new Date());
  }

  changeRole(newRole: Role): void {
    this._role = newRole;
  }
}

export { Member };
