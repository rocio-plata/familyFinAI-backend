import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { CategoryPeriodAggregate } from "../../../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../../src/shared-kernel/domain/period.js";

describe("CategoryPeriodAggregate", () => {
  const familyId = FamilyId.generate();
  const categoryId = CategoryId.generate();
  const period = Period.of(2026, 9);
  const clp = Currency.of("CLP");

  it("comienza sin movimientos y con acumulados en cero", () => {
    const aggregate = CategoryPeriodAggregate.create(familyId, categoryId, period, clp);

    assert.equal(aggregate.totalExpense.amount, 0);
    assert.equal(aggregate.totalIncome.amount, 0);
    assert.equal(aggregate.itemCount.value, 0);
  });

  it("acumula gastos e ingresos por separado", () => {
    const aggregate = CategoryPeriodAggregate.create(familyId, categoryId, period, clp);

    aggregate.registerItem(FinancialItemType.Expense, Money.of(35_000, clp));
    aggregate.registerItem(FinancialItemType.Income, Money.of(100_000, clp));

    assert.equal(aggregate.totalExpense.amount, 35_000);
    assert.equal(aggregate.totalIncome.amount, 100_000);
    assert.equal(aggregate.itemCount.value, 2);
  });

  it("revierte un movimiento sin permitir conteos negativos", () => {
    const aggregate = CategoryPeriodAggregate.create(familyId, categoryId, period, clp);
    aggregate.registerItem(FinancialItemType.Expense, Money.of(35_000, clp));

    aggregate.removeItem(FinancialItemType.Expense, Money.of(35_000, clp));

    assert.equal(aggregate.totalExpense.amount, 0);
    assert.equal(aggregate.itemCount.value, 0);
    assert.throws(() => aggregate.removeItem(FinancialItemType.Expense, Money.of(1, clp)), {
      name: "InvalidItemCountError",
    });
  });
});
