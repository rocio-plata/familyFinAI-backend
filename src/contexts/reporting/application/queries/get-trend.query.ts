// src/contexts/reporting/application/queries/get-trend.query.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { CategoryPeriodAggregate } from "../../domain/entities/category-period-aggregate.js";
import { InvalidPeriodRangeError } from "../../domain/errors/invalid-period-range.error.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

interface GetTrendInput {
  familyId: FamilyId;
  fromPeriod: Period;
  toPeriod: Period;
  categoryId?: CategoryId;
}

interface TrendPointDTO {
  period: Period;
  totalExpenses: Money;
  totalIncome: Money;
  balance: number;
}

class GetTrendQuery {
  constructor(private readonly aggregateRepository: CategoryPeriodAggregateRepository) {}

  async execute(input: GetTrendInput): Promise<TrendPointDTO[]> {
    if (input.fromPeriod.isAfter(input.toPeriod)) {
      throw new InvalidPeriodRangeError();
    }

    const periods = this.generatePeriods(input.fromPeriod, input.toPeriod);
    const aggregatesByPeriod = await Promise.all(
      periods.map(async (period) => ({
        period,
        aggregates: await this.aggregateRepository.findByFamilyIdAndPeriod(input.familyId, period),
      })),
    );

    return aggregatesByPeriod.map(({ period, aggregates }) => {
      const filteredAggregates = input.categoryId
        ? aggregates.filter((aggregate) =>
            aggregate.categoryId.equals(input.categoryId as CategoryId),
          )
        : aggregates;
      return this.toTrendPoint(period, filteredAggregates);
    });
  }

  private generatePeriods(fromPeriod: Period, toPeriod: Period): Period[] {
    const periods: Period[] = [];
    let currentPeriod = fromPeriod;
    while (!currentPeriod.isAfter(toPeriod)) {
      periods.push(currentPeriod);
      currentPeriod = currentPeriod.next();
    }
    return periods;
  }

  private toTrendPoint(period: Period, aggregates: CategoryPeriodAggregate[]): TrendPointDTO {
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
      period,
      totalExpenses: Money.of(totalExpenses, currency),
      totalIncome: Money.of(totalIncome, currency),
      balance: totalIncome - totalExpenses,
    };
  }
}

export type { GetTrendInput, TrendPointDTO };
export { GetTrendQuery };
