// src/contexts/family-access/domain/errors/invitation-not-for-user.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";
import type { InvitationId } from "../value-objects/invitation-id.js";

class InvitationNotForUserError extends DomainError {
  readonly code = "FAMILY.INVITATION_NOT_FOR_USER";

  constructor(invitationId: InvitationId) {
    super(`La invitación ${invitationId.toString()} no está dirigida a este usuario`);
  }
}

export { InvitationNotForUserError };
