// contexts/family-access/domain/events/family-created.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { FamilyId } from "../value-objects/family-id.js";

class FamilyCreated extends DomainEvent {
  readonly eventName = "family-access.family-created";

  constructor(readonly familyId: FamilyId) {
    super();
  }
}

export { FamilyCreated };