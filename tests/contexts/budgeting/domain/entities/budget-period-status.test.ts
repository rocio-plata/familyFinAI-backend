import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BudgetPeriodStatus } from "../../../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../../src/shared-kernel/domain/period.js";

describe("BudgetPeriodStatus", () => {
  const familyId = FamilyId.generate();
  const categoryId = CategoryId.generate();
  const clp = Currency.of("CLP");
  const period = Period.of(2026, 9);

  it("comienza con gasto cero y conserva el límite del período", () => {
    const status = BudgetPeriodStatus.create(familyId, categoryId, period, Money.of(100_000, clp));

    assert.equal(status.spent.amount, 0);
    assert.equal(status.limitAmount.amount, 100_000);
    assert.equal(status.remaining.amount, 100_000);
  });

  it("acumula gasto y calcula el saldo restante", () => {
    const status = BudgetPeriodStatus.create(familyId, categoryId, period, Money.of(100_000, clp));

    status.registerSpending(Money.of(35_000, clp));

    assert.equal(status.spent.amount, 35_000);
    assert.equal(status.remaining.amount, 65_000);
    assert.ok(!status.isOverspent);
  });

  it("marca sobregiro cuando el gasto supera el límite", () => {
    const status = BudgetPeriodStatus.create(familyId, categoryId, period, Money.of(100_000, clp));

    status.registerSpending(Money.of(100_001, clp));

    assert.ok(status.isOverspent);
    assert.equal(status.remaining.amount, -1);
  });
});
