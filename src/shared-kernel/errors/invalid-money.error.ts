// src/shared-kernel/errors/invalid-money.error.ts
import { DomainError } from "./domain-error.js";

class InvalidMoneyError extends DomainError {
  readonly code = "SHARED.INVALID_MONEY";

  constructor() {
    super("El monto no puede ser negativo");
  }
}

export { InvalidMoneyError };
