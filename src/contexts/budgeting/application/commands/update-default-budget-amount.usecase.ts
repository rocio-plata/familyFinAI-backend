// src/contexts/budgeting/application/commands/update-default-budget-amount.usecase.ts

import type { Money } from "../../../../shared-kernel/domain/money.js";
import { CurrencyMismatchError } from "../../../../shared-kernel/errors/currency-mismatch.error.js";
import type { GetFamilyDefaultCurrencyQuery } from "../../../family-access/application/queries/get-family-default-currency.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
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
  constructor(
    private readonly budgetConfigurationRepository: BudgetConfigurationRepository,
    private readonly getFamilyDefaultCurrencyQuery?: GetFamilyDefaultCurrencyQuery,
  ) {}

  async execute(input: UpdateDefaultBudgetAmountInput): Promise<BudgetConfiguration> {
    const configuration = await this.budgetConfigurationRepository.findById(
      input.budgetConfigurationId,
    );
    if (!configuration?.familyId.equals(input.familyId)) {
      throw new BudgetConfigurationNotFoundError(input.budgetConfigurationId.toString());
    }
    if (this.getFamilyDefaultCurrencyQuery) {
      const familyCurrency = await this.getFamilyDefaultCurrencyQuery.execute({
        familyId: input.familyId,
      });
      if (!familyCurrency.equals(input.newDefaultAmount.currency)) {
        throw new CurrencyMismatchError(
          familyCurrency.toString(),
          input.newDefaultAmount.currency.toString(),
        );
      }
    }

    configuration.updateDefaultAmount(input.newDefaultAmount);
    await this.budgetConfigurationRepository.save(configuration);
    return configuration;
  }
}

export type { UpdateDefaultBudgetAmountInput };
export { UpdateDefaultBudgetAmountUseCase };
