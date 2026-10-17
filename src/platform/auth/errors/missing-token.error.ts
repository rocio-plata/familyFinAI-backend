// src/platform/auth/errors/missing-token.error.ts
import { DomainError } from "../../../shared-kernel/errors/domain-error.js";

class MissingTokenError extends DomainError {
  readonly code = "AUTH.MISSING_TOKEN";

  constructor() {
    super("Falta el token de autenticación");
  }
}

export { MissingTokenError };
