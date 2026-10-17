// src/contexts/budgeting/application/commands/set-budget-override-for-period.usecase.ts

import type { Money } from "../../../../shared-kernel/domain/money.js";
import type { Period } from "../../../../shared-kernel/domain/period.js";
import { CurrencyMismatchError } from "../../../../shared-kernel/errors/currency-mismatch.error.js";
import type { GetFamilyDefaultCurrencyQuery } from "../../../family-access/application/queries/get-family-default-currency.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { BudgetConfiguration } from "../../domain/entities/budget-configuration.js";
import { BudgetConfigurationNotFoundError } from "../../domain/errors/budget-configuration-not-found.error.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import type { BudgetPeriodStatusRepository } from "../../domain/repositories/budget-period-status.repository.js";
import type { BudgetConfigurationId } from "../../domain/value-objects/budget-configuration-id.js";

interface SetBudgetOverrideForPeriodInput {
  familyId: FamilyId;
  budgetConfigurationId: BudgetConfigurationId;
  period: Period;
  overrideAmount: Money;
}

class SetBudgetOverrideForPeriodUseCase {
  constructor(
    private readonly budgetConfigurationRepository: BudgetConfigurationRepository,
    private readonly budgetPeriodStatusRepository: BudgetPeriodStatusRepository,
    private readonly getFamilyDefaultCurrencyQuery?: GetFamilyDefaultCurrencyQuery,
  ) {}

  async execute(input: SetBudgetOverrideForPeriodInput): Promise<BudgetConfiguration> {
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
      if (!familyCurrency.equals(input.overrideAmount.currency)) {
        throw new CurrencyMismatchError(
          familyCurrency.toString(),
          input.overrideAmount.currency.toString(),
        );
      }
    }

    configuration.setOverrideForPeriod(input.period, input.overrideAmount);
    await this.budgetConfigurationRepository.save(configuration);

    const status = await this.budgetPeriodStatusRepository.findByFamilyIdCategoryIdAndPeriod(
      input.familyId,
      configuration.categoryId,
      input.period,
    );
    if (status) {
      status.updateLimitAmount(input.overrideAmount);
      await this.budgetPeriodStatusRepository.save(status);
    }

    return configuration;
  }
}

export type { SetBudgetOverrideForPeriodInput };
export { SetBudgetOverrideForPeriodUseCase };
