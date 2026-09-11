import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BudgetPeriod } from "../../../../../src/contexts/budgeting/domain/value-objects/budget-period.js";

describe("BudgetPeriod", () => {
  describe("of()", () => {
    it("crea un período mensual válido", () => {
      const period = BudgetPeriod.of(2026, 9);

      assert.equal(period.toString(), "2026-09");
    });

    it("rechaza un mes fuera del rango válido", () => {
      assert.throws(() => BudgetPeriod.of(2026, 13), { name: "InvalidBudgetPeriodError" });
    });
  });

  describe("fromDate()", () => {
    it("convierte una fecha al período correspondiente", () => {
      const period = BudgetPeriod.fromDate(new Date("2026-09-15T12:00:00.000Z"));

      assert.equal(period.toString(), "2026-09");
    });
  });

  it("compara períodos por año y mes", () => {
    assert.ok(BudgetPeriod.of(2026, 9).equals(BudgetPeriod.of(2026, 9)));
    assert.ok(!BudgetPeriod.of(2026, 9).equals(BudgetPeriod.of(2026, 10)));
  });
});
