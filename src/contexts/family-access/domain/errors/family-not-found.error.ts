// contexts/family-access/domain/errors/family-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class FamilyNotFoundError extends DomainError {
  readonly code = "FAMILY_ACCESS.FAMILY_NOT_FOUND";

  constructor(familyId: unknown) {
    super(`No se encontró la familia '${familyId}'`);
  }
}

export { FamilyNotFoundError };