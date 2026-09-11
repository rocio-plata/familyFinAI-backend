// src/contexts/budgeting/domain/errors/invalid-budget-period.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidBudgetPeriodError extends DomainError {
  readonly code = "BUDGETING.INVALID_BUDGET_PERIOD";

  constructor(year: number, month: number) {
    super(`Invalid budget period: ${year}-${month}`);
  }
}

export { InvalidBudgetPeriodError };
