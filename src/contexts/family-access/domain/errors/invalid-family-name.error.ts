// contexts/family-access/domain/errors/invalid-family-name.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidFamilyNameError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVALID_FAMILY_NAME";

  constructor() {
    super("El nombre de la familia debe tener entre 1 y 60 caracteres");
  }
}

export { InvalidFamilyNameError };