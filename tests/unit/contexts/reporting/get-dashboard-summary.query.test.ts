// tests/contexts/reporting/get-dashboard-summary.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { GetDashboardSummaryQuery } from "../../../src/contexts/reporting/application/queries/get-dashboard-summary.query.js";
import { CategoryPeriodAggregate } from "../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("GetDashboardSummaryQuery", () => {
  let query: GetDashboardSummaryQuery;
  let repository: InMemoryCategoryPeriodAggregateRepository;
  let familyId: FamilyId;
  let period: Period;

  beforeEach(() => {
    repository = new InMemoryCategoryPeriodAggregateRepository();
    query = new GetDashboardSummaryQuery(repository);
    familyId = FamilyId.generate();
    period = Period.of(2026, 8);
  });

  test("devuelve un resumen en cero si la familia no tiene agregados en el período", async () => {
    const summary = await query.execute({ familyId, period });

    assert.equal(summary.totalExpenses.amount, 0);
    assert.equal(summary.totalIncome.amount, 0);
    assert.equal(summary.balance, 0);
    assert.deepEqual(summary.categoryBreakdown, []);
  });

  test("acumula gastos, ingresos y saldo de todas las categorías del período", async () => {
    const groceries = CategoryPeriodAggregate.create(
      familyId,
      CategoryId.generate(),
      period,
      Currency.default(),
    );
    groceries.registerItem(FinancialItemType.Expense, Money.of(20_000, Currency.default()));
    groceries.registerItem(FinancialItemType.Expense, Money.of(10_000, Currency.default()));

    const salary = CategoryPeriodAggregate.create(
      familyId,
      CategoryId.generate(),
      period,
      Currency.default(),
    );
    salary.registerItem(FinancialItemType.Income, Money.of(700_000, Currency.default()));

    await repository.save(groceries);
    await repository.save(salary);

    const summary = await query.execute({ familyId, period });

    assert.equal(summary.totalExpenses.amount, 30_000);
    assert.equal(summary.totalIncome.amount, 700_000);
    assert.equal(summary.balance, 670_000);
  });

  test("incluye el gasto y su proporción por categoría", async () => {
    const firstCategoryId = CategoryId.generate();
    const secondCategoryId = CategoryId.generate();
    const firstCategory = CategoryPeriodAggregate.create(
      familyId,
      firstCategoryId,
      period,
      Currency.default(),
    );
    const secondCategory = CategoryPeriodAggregate.create(
      familyId,
      secondCategoryId,
      period,
      Currency.default(),
    );
    firstCategory.registerItem(FinancialItemType.Expense, Money.of(75_000, Currency.default()));
    secondCategory.registerItem(FinancialItemType.Expense, Money.of(25_000, Currency.default()));
    await repository.save(firstCategory);
    await repository.save(secondCategory);

    const summary = await query.execute({ familyId, period });

    assert.deepEqual(
      summary.categoryBreakdown.map((category) => ({
        categoryId: category.categoryId.toString(),
        totalExpense: category.totalExpense.amount,
        percentage: category.percentage,
      })),
      [
        { categoryId: firstCategoryId.toString(), totalExpense: 75_000, percentage: 75 },
        { categoryId: secondCategoryId.toString(), totalExpense: 25_000, percentage: 25 },
      ],
    );
  });
});
