// contexts/family-access/domain/errors/invalid-user-id-error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidUserIdError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVALID_USER_ID";

  constructor(value: string) {
    super(`'${value}' no es un identificador de usuario válido`);
  }
}

export { InvalidUserIdError };