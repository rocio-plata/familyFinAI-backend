// /src/contexts/identity/domain/events/user-registered.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";

class UserRegistered extends DomainEvent {
  readonly eventName = "identity.user-registered";

  constructor(
    readonly userId: UserId,
    readonly email: string,
  ) {
    super();
  }
}

export { UserRegistered };
