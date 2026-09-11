// tests/contexts/reporting/get-period-comparison.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { GetPeriodComparisonQuery } from "../../../src/contexts/reporting/application/queries/get-period-comparison.query.js";
import { CategoryPeriodAggregate } from "../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("GetPeriodComparisonQuery", () => {
  let query: GetPeriodComparisonQuery;
  let repository: InMemoryCategoryPeriodAggregateRepository;
  let familyId: FamilyId;
  let periodA: Period;
  let periodB: Period;

  beforeEach(() => {
    repository = new InMemoryCategoryPeriodAggregateRepository();
    query = new GetPeriodComparisonQuery(repository);
    familyId = FamilyId.generate();
    periodA = Period.of(2026, 7);
    periodB = Period.of(2026, 8);
  });

  test("compara los gastos e ingresos totales de ambos períodos", async () => {
    await addAggregate(repository, familyId, periodA, FinancialItemType.Expense, 100_000);
    await addAggregate(repository, familyId, periodA, FinancialItemType.Income, 500_000);
    await addAggregate(repository, familyId, periodB, FinancialItemType.Expense, 150_000);
    await addAggregate(repository, familyId, periodB, FinancialItemType.Income, 550_000);

    const comparison = await query.execute({ familyId, periodA, periodB });

    assert.equal(comparison.periodA.totalExpenses.amount, 100_000);
    assert.equal(comparison.periodA.totalIncome.amount, 500_000);
    assert.equal(comparison.periodB.totalExpenses.amount, 150_000);
    assert.equal(comparison.periodB.totalIncome.amount, 550_000);
    assert.deepEqual(comparison.expenseVariation, { absolute: 50_000, percentage: 50 });
    assert.deepEqual(comparison.incomeVariation, { absolute: 50_000, percentage: 10 });
  });

  test("compara solo la categoría solicitada", async () => {
    const groceriesCategoryId = CategoryId.generate();
    const transportCategoryId = CategoryId.generate();
    await addAggregate(
      repository,
      familyId,
      periodA,
      FinancialItemType.Expense,
      30_000,
      groceriesCategoryId,
    );
    await addAggregate(
      repository,
      familyId,
      periodA,
      FinancialItemType.Expense,
      20_000,
      transportCategoryId,
    );
    await addAggregate(
      repository,
      familyId,
      periodB,
      FinancialItemType.Expense,
      45_000,
      groceriesCategoryId,
    );

    const comparison = await query.execute({
      familyId,
      periodA,
      periodB,
      categoryId: groceriesCategoryId,
    });

    assert.equal(comparison.periodA.totalExpenses.amount, 30_000);
    assert.equal(comparison.periodB.totalExpenses.amount, 45_000);
    assert.deepEqual(comparison.expenseVariation, { absolute: 15_000, percentage: 50 });
  });

  test("devuelve porcentaje cero cuando el primer período no tiene monto", async () => {
    await addAggregate(repository, familyId, periodB, FinancialItemType.Expense, 50_000);

    const comparison = await query.execute({ familyId, periodA, periodB });

    assert.equal(comparison.periodA.totalExpenses.amount, 0);
    assert.equal(comparison.periodB.totalExpenses.amount, 50_000);
    assert.deepEqual(comparison.expenseVariation, { absolute: 50_000, percentage: 0 });
  });
});

async function addAggregate(
  repository: InMemoryCategoryPeriodAggregateRepository,
  familyId: FamilyId,
  period: Period,
  type: FinancialItemType,
  amount: number,
  categoryId = CategoryId.generate(),
): Promise<void> {
  const aggregate = CategoryPeriodAggregate.create(
    familyId,
    categoryId,
    period,
    Currency.default(),
  );
  aggregate.registerItem(type, Money.of(amount, Currency.default()));
  await repository.save(aggregate);
}
