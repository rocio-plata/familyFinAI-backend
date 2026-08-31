// contexts/family-access/domain/errors/invalid-email.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidEmailError extends DomainError {
  readonly code = "FAMILY_ACCESS.INVALID_EMAIL";

  constructor(value: string) {
    super(`'${value}' no es un correo electrónico válido`);
  }
}

export { InvalidEmailError };
