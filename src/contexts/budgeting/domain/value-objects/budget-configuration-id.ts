// src/contexts/budgeting/domain/value-objects/budget-configuration-id.ts
import { randomUUID } from "node:crypto";

class BudgetConfigurationId {
  private constructor(private readonly value: string) {}

  static generate(): BudgetConfigurationId {
    return new BudgetConfigurationId(randomUUID());
  }

  toString(): string {
    return this.value;
  }

  equals(other: BudgetConfigurationId): boolean {
    return this.value === other.value;
  }
}

export { BudgetConfigurationId };
