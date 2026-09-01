// contexts/family-access/domain/errors/cannot-remove-last-owner.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class CannotRemoveLastOwnerError extends DomainError {
  readonly code = "FAMILY_ACCESS.CANNOT_REMOVE_LAST_OWNER";

  constructor() {
    super("La familia debe mantener al menos un Owner");
  }
}

export { CannotRemoveLastOwnerError };
