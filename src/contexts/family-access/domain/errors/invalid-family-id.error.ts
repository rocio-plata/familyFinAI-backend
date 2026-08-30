// contexts/family-access/domain/errors/invalid-family-id.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidFamilyIdError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVALID_FAMILY_ID";

  constructor(value: string) {
    super(`'${value}' no es un identificador de familia válido`);
  }
}

export { InvalidFamilyIdError };