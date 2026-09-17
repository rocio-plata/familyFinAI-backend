// tests/unit/contexts/reporting/domain/entities/payment-method-period-aggregate.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FinancialItemType } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { PaymentMethodId } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";
import { PaymentMethodPeriodAggregate } from "../../../../../../src/contexts/reporting/domain/entities/payment-method-period-aggregate.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../../../src/shared-kernel/domain/period.js";

describe("PaymentMethodPeriodAggregate", () => {
  test("registra gastos e ingresos por medio de pago", () => {
    const aggregate = PaymentMethodPeriodAggregate.create(
      FamilyId.generate(),
      PaymentMethodId.generate(),
      Period.of(2026, 9),
      Currency.of("CLP"),
    );
    aggregate.registerItem(FinancialItemType.Expense, Money.of(1000, Currency.of("CLP")));
    aggregate.registerItem(FinancialItemType.Income, Money.of(5000, Currency.of("CLP")));
    assert.equal(aggregate.totalExpense.amount, 1000);
    assert.equal(aggregate.totalIncome.amount, 5000);
    assert.equal(aggregate.itemCount.value, 2);
  });

  test("ajusta montos y elimina items", () => {
    const aggregate = PaymentMethodPeriodAggregate.create(
      FamilyId.generate(),
      PaymentMethodId.generate(),
      Period.of(2026, 9),
      Currency.of("CLP"),
    );
    aggregate.registerItem(FinancialItemType.Expense, Money.of(1000, Currency.of("CLP")));
    aggregate.changeItemAmount(
      FinancialItemType.Expense,
      Money.of(1000, Currency.of("CLP")),
      Money.of(1500, Currency.of("CLP")),
    );
    aggregate.removeItem(FinancialItemType.Expense, Money.of(1500, Currency.of("CLP")));
    assert.equal(aggregate.totalExpense.amount, 0);
    assert.equal(aggregate.itemCount.value, 0);
  });
});
