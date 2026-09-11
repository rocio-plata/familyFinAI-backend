// src/contexts/budgeting/domain/value-objects/budget-balance.ts
import type { Currency } from "../../../../shared-kernel/domain/currency.js";
import { InvalidBudgetBalanceError } from "../errors/invalid-budget-balance.error.js";

class BudgetBalance {
  private constructor(
    readonly amount: number,
    readonly currency: Currency,
  ) {}

  static of(amount: number, currency: Currency): BudgetBalance {
    if (!Number.isFinite(amount)) {
      throw new InvalidBudgetBalanceError();
    }
    return new BudgetBalance(amount, currency);
  }
}

export { BudgetBalance };
