// src/contexts/budgeting/domain/repositories/budget-configuration.repository.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { BudgetConfiguration } from "../entities/budget-configuration.js";

interface BudgetConfigurationRepository {
  save(configuration: BudgetConfiguration): Promise<void>;
  findByFamilyId(familyId: FamilyId): Promise<BudgetConfiguration[]>;
}

export type { BudgetConfigurationRepository };