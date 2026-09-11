// src/contexts/budgeting/domain/value-objects/budget-period.ts
import { InvalidBudgetPeriodError } from "../errors/invalid-budget-period.error.js";

class BudgetPeriod {
  private constructor(
    private readonly year: number,
    private readonly month: number,
  ) {}

  static of(year: number, month: number): BudgetPeriod {
    if (
      !Number.isInteger(year) ||
      year < 1 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      throw new InvalidBudgetPeriodError(year, month);
    }
    return new BudgetPeriod(year, month);
  }

  static current(): BudgetPeriod {
    return BudgetPeriod.fromDate(new Date());
  }

  static fromDate(date: Date): BudgetPeriod {
    return BudgetPeriod.of(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }

  toString(): string {
    return `${this.year}-${this.month.toString().padStart(2, "0")}`;
  }

  equals(other: BudgetPeriod): boolean {
    return this.year === other.year && this.month === other.month;
  }
}

export { BudgetPeriod };
