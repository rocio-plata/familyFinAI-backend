// src/contexts/family-access/infrastructure/adapters/family-financial-activity.adapter.ts

import type { BudgetConfigurationRepository } from "../../../budgeting/domain/repositories/budget-configuration.repository.js";
import type { FinancialItemRepository } from "../../../financial-tracking/domain/repositories/financial-item.repository.js";
import type { FamilyFinancialActivityPort } from "../../domain/ports/family-financial-activity.port.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";

class FamilyFinancialActivityAdapter implements FamilyFinancialActivityPort {
  constructor(
    private readonly financialItemRepository: FinancialItemRepository,
    private readonly budgetConfigurationRepository: BudgetConfigurationRepository,
  ) {}

  hasItems(familyId: FamilyId): Promise<boolean> {
    return this.financialItemRepository.existsByFamilyId(familyId);
  }

  hasActiveBudgets(familyId: FamilyId): Promise<boolean> {
    return this.budgetConfigurationRepository.existsActiveByFamilyId(familyId);
  }
}

export { FamilyFinancialActivityAdapter };
