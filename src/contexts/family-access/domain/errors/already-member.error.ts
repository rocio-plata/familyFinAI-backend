// contexts/family-access/domain/errors/already-member.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class AlreadyMemberError extends DomainError {
  readonly code = "FAMILY_ACCESS.ALREADY_MEMBER";

  constructor(email: unknown) {
    super(`El usuario con email '${email}' ya es miembro de esta familia`);
  }
}

export { AlreadyMemberError };
