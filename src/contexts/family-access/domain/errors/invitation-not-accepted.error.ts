// contexts/family-access/domain/errors/invitation-not-accepted.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvitationNotAcceptedError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVITATION_NOT_ACCEPTED";

  constructor(invitationId: unknown) {
    super(`La invitación '${invitationId}' aún no ha sido aceptada`);
  }
}

export { InvitationNotAcceptedError };
