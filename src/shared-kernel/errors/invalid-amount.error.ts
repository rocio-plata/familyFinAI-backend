// src/shared-kernel/errors/invalid-amount.error.ts
import { DomainError } from "./domain-error.js";

class InvalidAmountError extends DomainError {
  readonly code = "SHARED.INVALID_AMOUNT";

  constructor(reason = "debe ser un entero seguro no negativo") {
    super(`Monto inválido: ${reason}`);
  }
}

export { InvalidAmountError };
