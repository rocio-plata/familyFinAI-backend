// /src/contexts/identity/domain/errors/invalid-credentials.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidCredentialsError extends DomainError {
  readonly code = "IDENTITY.INVALID_CREDENTIALS";

  constructor() {
    // mensaje deliberadamente genérico — no debe distinguir si falló el email o la contraseña
    super("Email o contraseña incorrectos");
  }
}

export { InvalidCredentialsError };
