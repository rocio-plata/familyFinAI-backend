// src/contexts/budgeting/infrastructure/persistence/in-memory-budget-configuration.repository.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { BudgetConfiguration } from "../../domain/entities/budget-configuration.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import type { BudgetConfigurationId } from "../../domain/value-objects/budget-configuration-id.js";

class InMemoryBudgetConfigurationRepository implements BudgetConfigurationRepository {
  private readonly configurations = new Map<string, BudgetConfiguration>();

  async save(configuration: BudgetConfiguration): Promise<void> {
    this.configurations.set(configuration.id.toString(), configuration);
  }

  async findById(id: BudgetConfigurationId): Promise<BudgetConfiguration | null> {
    return this.configurations.get(id.toString()) ?? null;
  }

  async findByFamilyId(familyId: FamilyId): Promise<BudgetConfiguration[]> {
    return [...this.configurations.values()].filter((configuration) =>
      configuration.familyId.equals(familyId),
    );
  }
}

export { InMemoryBudgetConfigurationRepository };
