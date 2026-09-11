// src/contexts/budgeting/domain/repositories/budget-configuration.repository.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { BudgetConfiguration } from "../entities/budget-configuration.js";
import type { BudgetConfigurationId } from "../value-objects/budget-configuration-id.js";

interface BudgetConfigurationRepository {
  save(configuration: BudgetConfiguration): Promise<void>;
  findById(id: BudgetConfigurationId): Promise<BudgetConfiguration | null>;
  findByFamilyId(familyId: FamilyId): Promise<BudgetConfiguration[]>;
}

export type { BudgetConfigurationRepository };