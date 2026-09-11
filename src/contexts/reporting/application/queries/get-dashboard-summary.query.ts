// src/contexts/reporting/application/queries/get-dashboard-summary.query.ts

import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

interface GetDashboardSummaryInput {
  familyId: FamilyId;
  period?: Period;
}

interface DashboardCategoryBreakdownDTO {
  categoryId: CategoryId;
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
  constructor(private readonly aggregateRepository: CategoryPeriodAggregateRepository) {}

  async execute(input: GetDashboardSummaryInput): Promise<DashboardSummaryDTO> {
    const aggregates = await this.aggregateRepository.findByFamilyIdAndPeriod(
      input.familyId,
      input.period ?? Period.current(),
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
          totalExpense: aggregate.totalExpense,
          percentage:
            totalExpenses === 0 ? 0 : (aggregate.totalExpense.amount / totalExpenses) * 100,
        }))
        .sort((first, second) => second.totalExpense.amount - first.totalExpense.amount),
    };
  }
}

export type { DashboardCategoryBreakdownDTO, DashboardSummaryDTO, GetDashboardSummaryInput };
export { GetDashboardSummaryQuery };
