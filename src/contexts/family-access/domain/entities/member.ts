// /src/contexts/family-access/domain/entities/member.ts

import { Role } from "../value-objects/role.js";
import type { UserId } from "../value-objects/user-id.js";

class Member {
  private constructor(
    private readonly _userId: UserId,
    private _role: Role,
    private readonly _joinedAt: Date,
    private _displayOrder: number | null,
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
  // null = usar el orden natural por joinedAt, sin override manual todavía
  get displayOrder(): number | null {
    return this._displayOrder;
  }

  static createOwner(userId: UserId): Member {
    return new Member(userId, Role.owner(), new Date(), null);
  }

  static create(userId: UserId, role: Role): Member {
    return new Member(userId, role, new Date(), null);
  }

  changeRole(newRole: Role): void {
    this._role = newRole;
  }

  setDisplayOrder(order: number): void {
    this._displayOrder = order;
  }
}

export { Member };
