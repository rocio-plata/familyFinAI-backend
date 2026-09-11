// src/contexts/reporting/application/queries/get-period-comparison.query.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { CategoryPeriodAggregate } from "../../domain/entities/category-period-aggregate.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

interface GetPeriodComparisonInput {
  familyId: FamilyId;
  periodA: Period;
  periodB: Period;
  categoryId?: CategoryId;
}

interface PeriodTotalsDTO {
  totalExpenses: Money;
  totalIncome: Money;
  balance: number;
}

interface PeriodVariationDTO {
  absolute: number;
  percentage: number;
}

interface PeriodComparisonDTO {
  periodA: PeriodTotalsDTO;
  periodB: PeriodTotalsDTO;
  expenseVariation: PeriodVariationDTO;
  incomeVariation: PeriodVariationDTO;
}

class GetPeriodComparisonQuery {
  constructor(private readonly aggregateRepository: CategoryPeriodAggregateRepository) {}

  async execute(input: GetPeriodComparisonInput): Promise<PeriodComparisonDTO> {
    const [periodAAggregates, periodBAggregates] = await Promise.all([
      this.aggregateRepository.findByFamilyIdAndPeriod(input.familyId, input.periodA),
      this.aggregateRepository.findByFamilyIdAndPeriod(input.familyId, input.periodB),
    ]);
    const filteredPeriodAAggregates = this.filterByCategory(periodAAggregates, input.categoryId);
    const filteredPeriodBAggregates = this.filterByCategory(periodBAggregates, input.categoryId);
    const currency = this.resolveCurrency(filteredPeriodAAggregates, filteredPeriodBAggregates);
    const periodA = this.toTotals(filteredPeriodAAggregates, currency);
    const periodB = this.toTotals(filteredPeriodBAggregates, currency);

    return {
      periodA,
      periodB,
      expenseVariation: this.toVariation(
        periodA.totalExpenses.amount,
        periodB.totalExpenses.amount,
      ),
      incomeVariation: this.toVariation(periodA.totalIncome.amount, periodB.totalIncome.amount),
    };
  }

  private filterByCategory(
    aggregates: CategoryPeriodAggregate[],
    categoryId: CategoryId | undefined,
  ): CategoryPeriodAggregate[] {
    if (!categoryId) return aggregates;
    return aggregates.filter((aggregate) => aggregate.categoryId.equals(categoryId));
  }

  private resolveCurrency(
    periodAAggregates: CategoryPeriodAggregate[],
    periodBAggregates: CategoryPeriodAggregate[],
  ): Currency {
    return (
      periodAAggregates[0]?.totalExpense.currency ??
      periodBAggregates[0]?.totalExpense.currency ??
      Currency.default()
    );
  }

  private toTotals(aggregates: CategoryPeriodAggregate[], currency: Currency): PeriodTotalsDTO {
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
    };
  }

  private toVariation(firstAmount: number, secondAmount: number): PeriodVariationDTO {
    return {
      absolute: secondAmount - firstAmount,
      percentage: firstAmount === 0 ? 0 : ((secondAmount - firstAmount) / firstAmount) * 100,
    };
  }
}

export type { GetPeriodComparisonInput, PeriodComparisonDTO, PeriodTotalsDTO, PeriodVariationDTO };
export { GetPeriodComparisonQuery };
