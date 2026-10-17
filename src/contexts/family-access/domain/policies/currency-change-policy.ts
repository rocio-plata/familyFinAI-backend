// src/contexts/family-access/domain/policies/currency-change-policy.ts
import type { CurrencyLockReason } from "../errors/currency-locked.error.js";

class CurrencyChangePolicy {
  evaluate(hasItems: boolean, hasActiveBudgets: boolean): CurrencyLockReason[] {
    const reasons: CurrencyLockReason[] = [];
    if (hasItems) reasons.push("ITEMS_EXIST");
    if (hasActiveBudgets) reasons.push("ACTIVE_BUDGETS_EXIST");
    return reasons;
  }
}

export { CurrencyChangePolicy };
