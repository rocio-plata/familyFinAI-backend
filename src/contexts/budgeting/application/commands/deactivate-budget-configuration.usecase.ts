// src/contexts/budgeting/application/commands/deactivate-budget-configuration.usecase.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { BudgetConfiguration } from "../../domain/entities/budget-configuration.js";
import { BudgetConfigurationNotFoundError } from "../../domain/errors/budget-configuration-not-found.error.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import type { BudgetConfigurationId } from "../../domain/value-objects/budget-configuration-id.js";

interface DeactivateBudgetConfigurationInput {
  familyId: FamilyId;
  budgetConfigurationId: BudgetConfigurationId;
}

class DeactivateBudgetConfigurationUseCase {
  constructor(private readonly budgetConfigurationRepository: BudgetConfigurationRepository) {}

  async execute(input: DeactivateBudgetConfigurationInput): Promise<BudgetConfiguration> {
    const configuration = await this.budgetConfigurationRepository.findById(
      input.budgetConfigurationId,
    );
    if (!configuration?.familyId.equals(input.familyId)) {
      throw new BudgetConfigurationNotFoundError(input.budgetConfigurationId.toString());
    }

    configuration.deactivate();
    await this.budgetConfigurationRepository.save(configuration);
    return configuration;
  }
}

export type { DeactivateBudgetConfigurationInput };
export { DeactivateBudgetConfigurationUseCase };
