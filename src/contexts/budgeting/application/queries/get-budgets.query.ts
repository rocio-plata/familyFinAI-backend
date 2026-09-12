// src/contexts/budgeting/application/queries/get-budgets.query.ts
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { GetCategoriesQuery } from "../../../financial-tracking/application/queries/get-categories.query.js";
import type { CategoryName } from "../../../financial-tracking/domain/value-objects/category-name.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import type { BudgetPeriodStatusRepository } from "../../domain/repositories/budget-period-status.repository.js";
import type { BudgetBalance } from "../../domain/value-objects/budget-balance.js";

interface GetBudgetsInput {
  familyId: FamilyId;
  period: Period;
}

interface BudgetDTO {
  budgetConfigurationId: string;
  categoryId: string;
  categoryName: CategoryName;
  period: Period;
  limitAmount: Money;
  spent: Money;
  remaining: BudgetBalance;
  isOverspent: boolean;
}

class GetBudgetsQuery {
  constructor(
    private readonly budgetConfigurationRepository: BudgetConfigurationRepository,
    private readonly budgetPeriodStatusRepository: BudgetPeriodStatusRepository,
    private readonly getCategoriesQuery: GetCategoriesQuery,
  ) {}

  async execute(input: GetBudgetsInput): Promise<BudgetDTO[]> {
    const configurations = await this.budgetConfigurationRepository.findByFamilyId(input.familyId);
    const activeConfigurations = configurations.filter((configuration) => configuration.isActive);
    const categories = await this.getCategoriesQuery.execute({
      familyId: input.familyId,
      includeDeprecated: true,
    });
    const categoriesById = new Map(
      categories.map((category) => [category.id.toString(), category]),
    );

    const budgets = await Promise.all(
      activeConfigurations.map(async (configuration) => {
        const category = categoriesById.get(configuration.categoryId.toString());
        if (!category) return null;

        const limitAmount = configuration.resolveAmountFor(input.period);
        const status = await this.budgetPeriodStatusRepository.findByFamilyIdCategoryIdAndPeriod(
          input.familyId,
          configuration.categoryId,
          input.period,
        );
        const spent = status?.spent ?? Money.of(0, limitAmount.currency);
        const remaining = status
          ? status.remaining
          : {
              amount: limitAmount.amount - spent.amount,
              currency: limitAmount.currency,
            };

        return {
          budgetConfigurationId: configuration.id.toString(),
          categoryId: configuration.categoryId.toString(),
          categoryName: category.name,
          period: input.period,
          limitAmount,
          spent,
          remaining,
          isOverspent: spent.amount > limitAmount.amount,
        };
      }),
    );

    return budgets.filter((budget): budget is BudgetDTO => budget !== null);
  }
}

export type { BudgetDTO, GetBudgetsInput };
export { GetBudgetsQuery };
