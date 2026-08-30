// contexts/financial-tracking/domain/errors/future-transaction-date.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class FutureTransactionDateError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.FUTURE_TRANSACTION_DATE";

  constructor() {
    super("La fecha del movimiento no puede ser futura");
  }
}

export { FutureTransactionDateError };