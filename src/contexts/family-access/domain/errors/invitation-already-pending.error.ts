// src/contexts/family-access/domain/errors/invitation-already-pending.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvitationAlreadyPendingError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVITATION_ALREADY_PENDING";

  constructor(email: unknown) {
    super(`Ya existe una invitación pendiente para '${email}' en esta familia`);
  }
}

export { InvitationAlreadyPendingError };
