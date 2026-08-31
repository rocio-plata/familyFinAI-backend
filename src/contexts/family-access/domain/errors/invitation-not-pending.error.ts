// contexts/family-access/domain/errors/invitation-not-pending.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvitationNotPendingError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVITATION_NOT_PENDING";

  constructor(invitationId: unknown) {
    super(`La invitación '${invitationId}' ya no está pendiente`);
  }
}

export { InvitationNotPendingError };
