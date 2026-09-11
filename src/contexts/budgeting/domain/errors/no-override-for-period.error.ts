// src/contexts/budgeting/domain/errors/no-override-for-period.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class NoOverrideForPeriodError extends DomainError {
  readonly code = "BUDGETING.NO_OVERRIDE_FOR_PERIOD";

  constructor(period: string) {
    super(`No budget override exists for period ${period}`);
  }
}

export { NoOverrideForPeriodError };
