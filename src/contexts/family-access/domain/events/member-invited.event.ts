// contexts/family-access/domain/events/member-invited.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { EmailAddress } from "../value-objects/email-address.js";
import type { FamilyId } from "../value-objects/family-id.js";

class MemberInvited extends DomainEvent {
  readonly eventName = "family-access.member-invited";

  constructor(
    readonly familyId: FamilyId,
    readonly invitedEmail: EmailAddress,
  ) {
    super();
  }
}

export { MemberInvited };
