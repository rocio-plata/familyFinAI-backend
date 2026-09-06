// /src/contexts/identity/domain/errors/weak-password.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class WeakPasswordError extends DomainError {
  readonly code = "IDENTITY.WEAK_PASSWORD";

  constructor() {
    super("La contraseña debe tener al menos 8 caracteres");
  }
}

export { WeakPasswordError };
