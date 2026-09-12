// src/contexts/budgeting/application/commands/remove-budget-override-for-period.usecase.ts
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { BudgetConfiguration } from "../../domain/entities/budget-configuration.js";
import { BudgetConfigurationNotFoundError } from "../../domain/errors/budget-configuration-not-found.error.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import type { BudgetConfigurationId } from "../../domain/value-objects/budget-configuration-id.js";

interface RemoveBudgetOverrideForPeriodInput {
  familyId: FamilyId;
  budgetConfigurationId: BudgetConfigurationId;
  period: Period;
}

class RemoveBudgetOverrideForPeriodUseCase {
  constructor(private readonly budgetConfigurationRepository: BudgetConfigurationRepository) {}

  async execute(input: RemoveBudgetOverrideForPeriodInput): Promise<BudgetConfiguration> {
    const configuration = await this.budgetConfigurationRepository.findById(
      input.budgetConfigurationId,
    );
    if (!configuration?.familyId.equals(input.familyId)) {
      throw new BudgetConfigurationNotFoundError(input.budgetConfigurationId.toString());
    }

    configuration.removeOverrideForPeriod(input.period);
    await this.budgetConfigurationRepository.save(configuration);
    return configuration;
  }
}

export type { RemoveBudgetOverrideForPeriodInput };
export { RemoveBudgetOverrideForPeriodUseCase };
