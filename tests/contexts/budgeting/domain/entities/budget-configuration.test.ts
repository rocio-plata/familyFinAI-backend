import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BudgetConfiguration } from "../../../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { BudgetPeriod } from "../../../../../src/contexts/budgeting/domain/value-objects/budget-period.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";

describe("BudgetConfiguration", () => {
  const familyId = FamilyId.generate();
  const categoryId = CategoryId.generate();
  const clp = Currency.of("CLP");

  it("crea una configuración activa con monto por defecto", () => {
    const configuration = BudgetConfiguration.create(familyId, categoryId, Money.of(100_000, clp));

    assert.ok(configuration.isActive);
    assert.equal(configuration.defaultAmount.amount, 100_000);
    assert.equal(configuration.resolveAmountFor(BudgetPeriod.of(2026, 9)).amount, 100_000);
  });

  it("resuelve un override sin modificar el monto por defecto", () => {
    const configuration = BudgetConfiguration.create(familyId, categoryId, Money.of(100_000, clp));
    const period = BudgetPeriod.of(2026, 9);

    configuration.setOverrideForPeriod(period, Money.of(120_000, clp));

    assert.equal(configuration.defaultAmount.amount, 100_000);
    assert.equal(configuration.resolveAmountFor(period).amount, 120_000);
  });

  it("vuelve al monto por defecto al eliminar un override", () => {
    const configuration = BudgetConfiguration.create(familyId, categoryId, Money.of(100_000, clp));
    const period = BudgetPeriod.of(2026, 9);
    configuration.setOverrideForPeriod(period, Money.of(120_000, clp));

    configuration.removeOverrideForPeriod(period);

    assert.equal(configuration.resolveAmountFor(period).amount, 100_000);
  });

  it("se puede desactivar sin borrar su configuración", () => {
    const configuration = BudgetConfiguration.create(familyId, categoryId, Money.of(100_000, clp));

    configuration.deactivate();

    assert.ok(!configuration.isActive);
  });
});
