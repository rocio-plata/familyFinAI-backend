// contexts/family-access/domain/errors/member-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class MemberNotFoundError extends DomainError {
  readonly code = "FAMILY_ACCESS.MEMBER_NOT_FOUND";

  constructor(userId: unknown) {
    super(`No se encontró al miembro '${userId}' en la familia`);
  }
}

export { MemberNotFoundError };
