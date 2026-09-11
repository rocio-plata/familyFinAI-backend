// tests/contexts/reporting/get-trend.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { GetTrendQuery } from "../../../src/contexts/reporting/application/queries/get-trend.query.js";
import { CategoryPeriodAggregate } from "../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { InvalidPeriodRangeError } from "../../../src/contexts/reporting/domain/errors/invalid-period-range.error.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("GetTrendQuery", () => {
  let query: GetTrendQuery;
  let repository: InMemoryCategoryPeriodAggregateRepository;
  let familyId: FamilyId;

  beforeEach(() => {
    repository = new InMemoryCategoryPeriodAggregateRepository();
    query = new GetTrendQuery(repository);
    familyId = FamilyId.generate();
  });

  test("devuelve la serie mensual inclusiva y asume cero si no hay datos", async () => {
    const categoryId = CategoryId.generate();
    await addAggregate(repository, familyId, Period.of(2026, 1), categoryId, 100_000, 300_000);
    await addAggregate(repository, familyId, Period.of(2026, 3), categoryId, 150_000, 350_000);

    const trend = await query.execute({
      familyId,
      fromPeriod: Period.of(2026, 1),
      toPeriod: Period.of(2026, 3),
    });

    assert.deepEqual(
      trend.map((point) => ({
        period: point.period.toString(),
        expenses: point.totalExpenses.amount,
        income: point.totalIncome.amount,
      })),
      [
        { period: "2026-01", expenses: 100_000, income: 300_000 },
        { period: "2026-02", expenses: 0, income: 0 },
        { period: "2026-03", expenses: 150_000, income: 350_000 },
      ],
    );
  });

  test("incluye períodos que cruzan el cambio de año", async () => {
    const trend = await query.execute({
      familyId,
      fromPeriod: Period.of(2026, 12),
      toPeriod: Period.of(2027, 2),
    });

    assert.deepEqual(
      trend.map((point) => point.period.toString()),
      ["2026-12", "2027-01", "2027-02"],
    );
  });

  test("filtra los agregados por categoría cuando se especifica", async () => {
    const selectedCategoryId = CategoryId.generate();
    await addAggregate(repository, familyId, Period.of(2026, 1), selectedCategoryId, 50_000, 0);
    await addAggregate(repository, familyId, Period.of(2026, 1), CategoryId.generate(), 90_000, 0);

    const trend = await query.execute({
      familyId,
      fromPeriod: Period.of(2026, 1),
      toPeriod: Period.of(2026, 1),
      categoryId: selectedCategoryId,
    });

    assert.equal(trend[0].totalExpenses.amount, 50_000);
  });

  test("rechaza un rango cuyo inicio es posterior al final", async () => {
    await assert.rejects(
      query.execute({
        familyId,
        fromPeriod: Period.of(2026, 3),
        toPeriod: Period.of(2026, 1),
      }),
      InvalidPeriodRangeError,
    );
  });
});

async function addAggregate(
  repository: InMemoryCategoryPeriodAggregateRepository,
  familyId: FamilyId,
  period: Period,
  categoryId: CategoryId,
  expense: number,
  income: number,
): Promise<void> {
  const aggregate = CategoryPeriodAggregate.create(
    familyId,
    categoryId,
    period,
    Currency.default(),
  );
  if (expense > 0) {
    aggregate.registerItem(FinancialItemType.Expense, Money.of(expense, Currency.default()));
  }
  if (income > 0) {
    aggregate.registerItem(FinancialItemType.Income, Money.of(income, Currency.default()));
  }
  await repository.save(aggregate);
}
