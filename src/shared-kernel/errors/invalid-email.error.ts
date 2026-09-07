// src/shared-kernel/errors/invalid-email.error.ts
import { DomainError } from "./domain-error.js";

class InvalidEmailError extends DomainError {
  readonly code = "SHARED.INVALID_EMAIL";

  constructor(value: string) {
    super(`'${value}' no es un correo electrónico válido`);
  }
}

export { InvalidEmailError };
