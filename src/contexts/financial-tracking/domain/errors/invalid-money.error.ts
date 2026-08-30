// contexts/financial-tracking/domain/errors/invalid-money.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidMoneyError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_MONEY";

  constructor() {
    super("El monto no puede ser negativo");
  }
}

export { InvalidMoneyError };