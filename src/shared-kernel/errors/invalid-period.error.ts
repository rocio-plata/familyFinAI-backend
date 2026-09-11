// src/shared-kernel/errors/invalid-period.error.ts
import { DomainError } from "./domain-error.js";

class InvalidPeriodError extends DomainError {
  readonly code = "SHARED.INVALID_PERIOD";

  constructor(year: number, month: number) {
    super(`Invalid period: ${year}-${month}`);
  }
}

export { InvalidPeriodError };
