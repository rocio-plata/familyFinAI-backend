// contexts/family-access/domain/errors/invitation-expired.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvitationExpiredError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVITATION_EXPIRED";

  constructor(invitationId: unknown) {
    super(`La invitación '${invitationId}' ya expiró`);
  }
}

export { InvitationExpiredError };
