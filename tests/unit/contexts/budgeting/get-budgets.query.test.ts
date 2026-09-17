// tests/contexts/budgeting/get-budgets.query.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GetBudgetsQuery } from "../../../src/contexts/budgeting/application/queries/get-budgets.query.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { BudgetPeriodStatus } from "../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { GetCategoriesQuery } from "../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryRepository } from "../financial-tracking/doubles/in-memory-category.repository.js";
import { InMemoryBudgetConfigurationRepository } from "./doubles/in-memory-budget-configuration.repository.js";
import { InMemoryBudgetPeriodStatusRepository } from "./doubles/in-memory-budget-period-status.repository.js";

describe("GetBudgetsQuery", () => {
  test("lista presupuestos activos con override, gasto, restante y nombre de categoría", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const category = Category.create(
      family.id,
      FinancialItemType.Expense,
      CategoryName.of("Supermercado"),
    );
    const period = Period.of(2026, 8);
    const currency = Currency.default();
    const budget = BudgetConfiguration.create(family.id, category.id, Money.of(100_000, currency));
    budget.setOverrideForPeriod(period, Money.of(60_000, currency));
    const status = BudgetPeriodStatus.create(
      family.id,
      category.id,
      period,
      Money.of(60_000, currency),
    );
    status.registerSpending(Money.of(45_000, currency));
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    const categoryRepository = new InMemoryCategoryRepository();
    await configurationRepository.save(budget);
    await statusRepository.save(status);
    await categoryRepository.save(category);
    const query = new GetBudgetsQuery(
      configurationRepository,
      statusRepository,
      new GetCategoriesQuery(categoryRepository),
    );

    const result = await query.execute({ familyId: family.id, period });

    assert.equal(result.length, 1);
    assert.equal(result[0].categoryName.toString(), "Supermercado");
    assert.equal(result[0].limitAmount.amount, 60_000);
    assert.equal(result[0].spent.amount, 45_000);
    assert.equal(result[0].remaining.amount, 15_000);
    assert.equal(result[0].isOverspent, false);
  });

  test("asume gasto cero cuando no existe status mensual y omite configuraciones inactivas", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const activeCategory = Category.create(
      family.id,
      FinancialItemType.Expense,
      CategoryName.of("Comestibles"),
    );
    const inactiveCategory = Category.create(
      family.id,
      FinancialItemType.Expense,
      CategoryName.of("Transporte"),
    );
    const activeBudget = BudgetConfiguration.create(
      family.id,
      activeCategory.id,
      Money.of(80_000, Currency.default()),
    );
    const inactiveBudget = BudgetConfiguration.create(
      family.id,
      inactiveCategory.id,
      Money.of(50_000, Currency.default()),
    );
    inactiveBudget.deactivate();
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    await configurationRepository.save(activeBudget);
    await configurationRepository.save(inactiveBudget);
    const categoryRepository = new InMemoryCategoryRepository();
    await categoryRepository.save(activeCategory);
    await categoryRepository.save(inactiveCategory);
    const query = new GetBudgetsQuery(
      configurationRepository,
      new InMemoryBudgetPeriodStatusRepository(),
      new GetCategoriesQuery(categoryRepository),
    );

    const result = await query.execute({
      familyId: family.id,
      period: Period.of(2026, 8),
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].spent.amount, 0);
    assert.equal(result[0].remaining.amount, 80_000);
  });
});
