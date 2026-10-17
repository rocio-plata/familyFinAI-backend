// src/platform/auth/errors/invalid-token.error.ts
import { DomainError } from "../../../shared-kernel/errors/domain-error.js";

class InvalidTokenError extends DomainError {
  readonly code = "AUTH.INVALID_TOKEN";

  constructor() {
    super("Token inválido o expirado");
  }
}

export { InvalidTokenError };
