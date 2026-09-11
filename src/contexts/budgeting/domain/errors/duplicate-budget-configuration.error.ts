// src/contexts/budgeting/domain/errors/duplicate-budget-configuration.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class DuplicateBudgetConfigurationError extends DomainError {
  readonly code = "BUDGETING.DUPLICATE_BUDGET_CONFIGURATION";

  constructor(categoryId: string) {
    super(`Ya existe un presupuesto activo para la categoría ${categoryId}`);
  }
}

export { DuplicateBudgetConfigurationError };