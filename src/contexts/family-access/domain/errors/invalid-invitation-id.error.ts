// contexts/family-access/domain/errors/invalid-invitation-id.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidInvitationIdError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVALID_INVITATION_ID";

  constructor(value: string) {
    super(`'${value}' no es un identificador de invitación válido`);
  }
}

export { InvalidInvitationIdError };
