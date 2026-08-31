// contexts/family-access/domain/errors/invitation-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvitationNotFoundError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVITATION_NOT_FOUND";

  constructor(invitationId: unknown) {
    super(`No se encontró la invitación '${invitationId}'`);
  }
}

export { InvitationNotFoundError };