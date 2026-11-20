// src/contexts/reporting/application/queries/get-dashboard-summary.query.ts

import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import { calculatePercentage } from "../../../../shared-kernel/domain/percentage.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { GetCategoriesQuery } from "../../../financial-tracking/application/queries/get-categories.query.js";
import type { CategoryColor } from "../../../financial-tracking/domain/value-objects/category-color.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

interface GetDashboardSummaryInput {
  familyId: FamilyId;
  period?: Period;
}

interface DashboardCategoryBreakdownDTO {
  categoryId: CategoryId;
  color: CategoryColor | null;
  totalExpense: Money;
  percentage: number;
}

interface DashboardSummaryDTO {
  totalExpenses: Money;
  totalIncome: Money;
  balance: number;
  categoryBreakdown: DashboardCategoryBreakdownDTO[];
}

class GetDashboardSummaryQuery {
  constructor(
    private readonly aggregateRepository: CategoryPeriodAggregateRepository,
    private readonly getCategoriesQuery: GetCategoriesQuery,
  ) {}

  async execute(input: GetDashboardSummaryInput): Promise<DashboardSummaryDTO> {
    const [aggregates, categories] = await Promise.all([
      this.aggregateRepository.findByFamilyIdAndPeriod(
        input.familyId,
        input.period ?? Period.current(),
      ),
      this.getCategoriesQuery.execute({ familyId: input.familyId, includeDeprecated: true }),
    ]);
    const colorsById = new Map(
      categories.map((category) => [category.id.toString(), category.color]),
    );
    const currency = aggregates[0]?.totalExpense.currency ?? Currency.default();
    const totalExpenses = aggregates.reduce(
      (total, aggregate) => total + aggregate.totalExpense.amount,
      0,
    );
    const totalIncome = aggregates.reduce(
      (total, aggregate) => total + aggregate.totalIncome.amount,
      0,
    );

    return {
      totalExpenses: Money.of(totalExpenses, currency),
      totalIncome: Money.of(totalIncome, currency),
      balance: totalIncome - totalExpenses,
      categoryBreakdown: aggregates
        .map((aggregate) => ({
          categoryId: aggregate.categoryId,
          color: colorsById.get(aggregate.categoryId.toString()) ?? null,
          totalExpense: aggregate.totalExpense,
          percentage: calculatePercentage(aggregate.totalExpense.amount, totalExpenses),
        }))
        .sort((first, second) => second.totalExpense.amount - first.totalExpense.amount),
    };
  }
}

export type { DashboardCategoryBreakdownDTO, DashboardSummaryDTO, GetDashboardSummaryInput };
export { GetDashboardSummaryQuery };
