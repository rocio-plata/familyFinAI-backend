// contexts/family-access/domain/events/invitation-accepted.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { FamilyId } from "../value-objects/family-id.js";
import type { UserId } from "../value-objects/user-id.js";
import type { Role } from "../value-objects/role.js";
import type { InvitationId } from "../value-objects/invitation-id.js";

class InvitationAccepted extends DomainEvent {
  readonly eventName = "family-access.invitation-accepted";

  constructor(
    readonly invitationId: InvitationId,
    readonly familyId: FamilyId,
    readonly acceptedBy: UserId,
    readonly role: Role,
  ) {
    super();
  }
}

export { InvitationAccepted };