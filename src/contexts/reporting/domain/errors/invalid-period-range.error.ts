// src/contexts/reporting/domain/errors/invalid-period-range.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidPeriodRangeError extends DomainError {
  readonly code = "REPORTING.INVALID_PERIOD_RANGE";

  constructor() {
    super("El período inicial no puede ser posterior al período final");
  }
}

export { InvalidPeriodRangeError };
