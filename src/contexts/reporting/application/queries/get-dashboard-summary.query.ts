// src/contexts/reporting/application/queries/get-dashboard-summary.query.ts

import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import { calculatePercentage } from "../../../../shared-kernel/domain/percentage.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type {
  CategoryDTO,
  GetCategoriesQuery,
} from "../../../financial-tracking/application/queries/get-categories.query.js";
import type { CategoryColor } from "../../../financial-tracking/domain/value-objects/category-color.js";
import type { CategoryIcon } from "../../../financial-tracking/domain/value-objects/category-icon.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import type { CategoryName } from "../../../financial-tracking/domain/value-objects/category-name.js";
import { CategoryStatus } from "../../../financial-tracking/domain/value-objects/category-status.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import type { CategoryPeriodAggregate } from "../../domain/entities/category-period-aggregate.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

interface GetDashboardSummaryInput {
  familyId: FamilyId;
  period?: Period;
}

interface DashboardCategoryBreakdownDTO {
  categoryId: CategoryId;
  name: CategoryName;
  icon: CategoryIcon | null;
  color: CategoryColor | null;
  status: CategoryStatus;
  amount: Money;
  percentage: number;
}

interface DashboardSummaryDTO {
  period: Period;
  currency: Currency;
  totalExpenses: Money;
  totalIncome: Money;
  balance: Money;
  expenseByCategory: DashboardCategoryBreakdownDTO[];
  incomeByCategory: DashboardCategoryBreakdownDTO[];
}

class GetDashboardSummaryQuery {
  constructor(
    private readonly aggregateRepository: CategoryPeriodAggregateRepository,
    private readonly getCategoriesQuery: GetCategoriesQuery,
  ) {}

  async execute(input: GetDashboardSummaryInput): Promise<DashboardSummaryDTO> {
    const period = input.period ?? Period.current();
    const [aggregates, categories] = await Promise.all([
      this.aggregateRepository.findByFamilyIdAndPeriod(input.familyId, period),
      this.getCategoriesQuery.execute({ familyId: input.familyId, includeDeprecated: true }),
    ]);
    const currency = aggregates[0]?.totalExpense.currency ?? Currency.default();
    const totalExpenses = aggregates.reduce(
      (total, aggregate) => total + aggregate.totalExpense.amount,
      0,
    );
    const totalIncome = aggregates.reduce(
      (total, aggregate) => total + aggregate.totalIncome.amount,
      0,
    );
    const aggregatesByCategory = new Map(
      aggregates.map((aggregate) => [aggregate.categoryId.toString(), aggregate]),
    );

    return {
      period,
      currency,
      totalExpenses: Money.of(totalExpenses, currency),
      totalIncome: Money.of(totalIncome, currency),
      balance: Money.of(totalIncome - totalExpenses, currency),
      expenseByCategory: this.breakdownFor(
        FinancialItemType.Expense,
        categories,
        aggregatesByCategory,
        totalExpenses,
        currency,
      ),
      incomeByCategory: this.breakdownFor(
        FinancialItemType.Income,
        categories,
        aggregatesByCategory,
        totalIncome,
        currency,
      ),
    };
  }

  // Todas las categorías activas del tipo (incluso en $0) más las deprecadas con movimientos.
  private breakdownFor(
    type: FinancialItemType,
    categories: CategoryDTO[],
    aggregatesByCategory: Map<string, CategoryPeriodAggregate>,
    total: number,
    currency: Currency,
  ): DashboardCategoryBreakdownDTO[] {
    return categories
      .filter((category) => category.type === type)
      .map((category) => {
        const aggregate = aggregatesByCategory.get(category.id.toString());
        const amount = aggregate
          ? type === FinancialItemType.Expense
            ? aggregate.totalExpense
            : aggregate.totalIncome
          : Money.of(0, currency);
        return { category, amount };
      })
      .filter(
        ({ category, amount }) => category.status === CategoryStatus.Active || amount.amount > 0,
      )
      .map(({ category, amount }) => ({
        categoryId: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        status: category.status,
        amount,
        percentage: calculatePercentage(amount.amount, total),
      }))
      .sort(
        (first, second) =>
          second.amount.amount - first.amount.amount ||
          first.name.toString().localeCompare(second.name.toString()),
      );
  }
}

export type { DashboardCategoryBreakdownDTO, DashboardSummaryDTO, GetDashboardSummaryInput };
export { GetDashboardSummaryQuery };
