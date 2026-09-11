// src/contexts/budgeting/domain/value-objects/budget-period-status-id.ts
import { randomUUID } from "node:crypto";

class BudgetPeriodStatusId {
  private constructor(private readonly value: string) {}

  static generate(): BudgetPeriodStatusId {
    return new BudgetPeriodStatusId(randomUUID());
  }

  toString(): string {
    return this.value;
  }

  equals(other: BudgetPeriodStatusId): boolean {
    return this.value === other.value;
  }
}

export { BudgetPeriodStatusId };
