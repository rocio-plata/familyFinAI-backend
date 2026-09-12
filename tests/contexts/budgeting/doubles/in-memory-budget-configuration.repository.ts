// tests/contexts/budgeting/doubles/in-memory-budget-configuration.repository.ts

import type { BudgetConfiguration } from "../../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import type { BudgetConfigurationRepository } from "../../../../src/contexts/budgeting/domain/repositories/budget-configuration.repository.js";
import type { BudgetConfigurationId } from "../../../../src/contexts/budgeting/domain/value-objects/budget-configuration-id.js";
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";

class InMemoryBudgetConfigurationRepository implements BudgetConfigurationRepository {
  private readonly budgets = new Map<string, BudgetConfiguration>();

  async save(budget: BudgetConfiguration): Promise<void> {
    this.budgets.set(budget.id.toString(), budget);
  }

  async findById(id: BudgetConfigurationId): Promise<BudgetConfiguration | null> {
    return this.budgets.get(id.toString()) ?? null;
  }

  async findByFamilyId(familyId: FamilyId): Promise<BudgetConfiguration[]> {
    return [...this.budgets.values()].filter((budget) => budget.familyId.equals(familyId));
  }
}

export { InMemoryBudgetConfigurationRepository };
