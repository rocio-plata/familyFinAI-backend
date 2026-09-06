// /src/contexts/identity/domain/errors/invalid-display-name.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidDisplayNameError extends DomainError {
  readonly code = "IDENTITY.INVALID_DISPLAY_NAME";

  constructor() {
    super("El nombre a mostrar debe tener entre 1 y 60 caracteres");
  }
}

export { InvalidDisplayNameError };
