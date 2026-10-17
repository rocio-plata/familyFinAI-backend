// src/contexts/family-access/domain/errors/currency-locked.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

const CURRENCY_LOCK_REASONS = ["ITEMS_EXIST", "ACTIVE_BUDGETS_EXIST"] as const;
type CurrencyLockReason = (typeof CURRENCY_LOCK_REASONS)[number];

class CurrencyLockedError extends DomainError {
  readonly code = "FAMILY.CURRENCY_LOCKED";

  constructor(readonly reasons: CurrencyLockReason[]) {
    super("No se puede cambiar la moneda mientras existan movimientos o presupuestos activos");
  }

  get details(): { reasons: CurrencyLockReason[] } {
    return { reasons: this.reasons };
  }
}

export type { CurrencyLockReason };
export { CurrencyLockedError };
