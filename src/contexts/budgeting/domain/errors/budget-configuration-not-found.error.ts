// src/contexts/budgeting/domain/errors/budget-configuration-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class BudgetConfigurationNotFoundError extends DomainError {
  readonly code = "BUDGETING.BUDGET_CONFIGURATION_NOT_FOUND";

  constructor(id: string) {
    super(`No se encontró la configuración de presupuesto ${id}`);
  }
}

export { BudgetConfigurationNotFoundError };