// src/contexts/financial-tracking/domain/errors/financial-item-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class FinancialItemNotFoundError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.FINANCIAL_ITEM_NOT_FOUND";

  constructor(itemId: string) {
    super(`El movimiento financiero con id ${itemId} no existe`);
  }
}

export { FinancialItemNotFoundError };
