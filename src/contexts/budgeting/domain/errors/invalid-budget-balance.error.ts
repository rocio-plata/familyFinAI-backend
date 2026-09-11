// src/contexts/budgeting/domain/errors/invalid-budget-balance.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidBudgetBalanceError extends DomainError {
  readonly code = "BUDGETING.INVALID_BUDGET_BALANCE";

  constructor() {
    super("El saldo del presupuesto debe ser un número finito");
  }
}

export { InvalidBudgetBalanceError };
