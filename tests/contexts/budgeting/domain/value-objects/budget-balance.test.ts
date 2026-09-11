import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BudgetBalance } from "../../../../../src/contexts/budgeting/domain/value-objects/budget-balance.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";

describe("BudgetBalance", () => {
  it("permite saldos negativos para representar un sobregiro", () => {
    const balance = BudgetBalance.of(-1, Currency.of("CLP"));

    assert.equal(balance.amount, -1);
  });

  it("rechaza un saldo no finito", () => {
    assert.throws(() => BudgetBalance.of(Number.NaN, Currency.of("CLP")), {
      name: "InvalidBudgetBalanceError",
    });
  });
});
