// contexts/family-access/domain/events/member-role-changed.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { FamilyId } from "../value-objects/family-id.js";
import type { Role } from "../value-objects/role.js";
import type { UserId } from "../value-objects/user-id.js";

class MemberRoleChanged extends DomainEvent {
  readonly eventName = "family-access.member-role-changed";

  constructor(
    readonly familyId: FamilyId,
    readonly memberId: UserId,
    readonly newRole: Role,
    readonly changedBy: UserId,
  ) {
    super();
  }
}

export { MemberRoleChanged };
