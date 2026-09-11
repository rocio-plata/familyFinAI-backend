// src/contexts/budgeting/application/commands/update-default-budget-amount.usecase.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { BudgetConfiguration } from "../../domain/entities/budget-configuration.js";
import { BudgetConfigurationNotFoundError } from "../../domain/errors/budget-configuration-not-found.error.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import type { BudgetConfigurationId } from "../../domain/value-objects/budget-configuration-id.js";

interface UpdateDefaultBudgetAmountInput {
  familyId: FamilyId;
  budgetConfigurationId: BudgetConfigurationId;
  newDefaultAmount: Money;
}

class UpdateDefaultBudgetAmountUseCase {
  constructor(private readonly budgetConfigurationRepository: BudgetConfigurationRepository) {}

  async execute(input: UpdateDefaultBudgetAmountInput): Promise<BudgetConfiguration> {
    const configuration = await this.budgetConfigurationRepository.findById(
      input.budgetConfigurationId,
    );
    if (!configuration || !configuration.familyId.equals(input.familyId)) {
      throw new BudgetConfigurationNotFoundError(input.budgetConfigurationId.toString());
    }

    configuration.updateDefaultAmount(input.newDefaultAmount);
    await this.budgetConfigurationRepository.save(configuration);
    return configuration;
  }
}

export type { UpdateDefaultBudgetAmountInput };
export { UpdateDefaultBudgetAmountUseCase };
