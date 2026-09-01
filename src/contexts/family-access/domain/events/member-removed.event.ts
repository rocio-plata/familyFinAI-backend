// contexts/family-access/domain/events/member-removed.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { FamilyId } from "../value-objects/family-id.js";
import type { UserId } from "../value-objects/user-id.js";

class MemberRemoved extends DomainEvent {
  readonly eventName = "family-access.member-removed";

  constructor(
    readonly familyId: FamilyId,
    readonly removedUserId: UserId,
    readonly removedBy: UserId,
  ) {
    super();
  }
}

export { MemberRemoved };