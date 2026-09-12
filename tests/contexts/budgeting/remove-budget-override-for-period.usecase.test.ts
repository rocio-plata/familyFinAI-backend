// tests/contexts/budgeting/remove-budget-override-for-period.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { RemoveBudgetOverrideForPeriodUseCase } from "../../../src/contexts/budgeting/application/commands/remove-budget-override-for-period.usecase.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryBudgetConfigurationRepository } from "./doubles/in-memory-budget-configuration.repository.js";

describe("RemoveBudgetOverrideForPeriodUseCase", () => {
  test("elimina el override y vuelve al monto por defecto", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const period = Period.of(2026, 8);
    const budget = BudgetConfiguration.create(
      family.id,
      CategoryId.generate(),
      Money.of(100_000, Currency.default()),
    );
    budget.setOverrideForPeriod(period, Money.of(60_000, Currency.default()));
    const repository = new InMemoryBudgetConfigurationRepository();
    await repository.save(budget);
    const useCase = new RemoveBudgetOverrideForPeriodUseCase(repository);

    const result = await useCase.execute({
      familyId: family.id,
      budgetConfigurationId: budget.id,
      period,
    });

    assert.equal(result.resolveAmountFor(period).amount, 100_000);
    assert.equal((await repository.findById(budget.id))?.resolveAmountFor(period).amount, 100_000);
  });

  test("rechaza eliminar un override inexistente", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const budget = BudgetConfiguration.create(
      family.id,
      CategoryId.generate(),
      Money.of(100_000, Currency.default()),
    );
    const repository = new InMemoryBudgetConfigurationRepository();
    await repository.save(budget);
    const useCase = new RemoveBudgetOverrideForPeriodUseCase(repository);

    await assert.rejects(
      useCase.execute({
        familyId: family.id,
        budgetConfigurationId: budget.id,
        period: Period.of(2026, 8),
      }),
      { name: "NoOverrideForPeriodError" },
    );
  });

  test("rechaza una configuración que pertenece a otra familia", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const otherFamily = Family.create(FamilyName.of("Otra familia"), UserId.generate());
    const budget = BudgetConfiguration.create(
      otherFamily.id,
      CategoryId.generate(),
      Money.of(100_000, Currency.default()),
    );
    const repository = new InMemoryBudgetConfigurationRepository();
    await repository.save(budget);
    const useCase = new RemoveBudgetOverrideForPeriodUseCase(repository);

    await assert.rejects(
      useCase.execute({
        familyId: family.id,
        budgetConfigurationId: budget.id,
        period: Period.of(2026, 8),
      }),
      { name: "BudgetConfigurationNotFoundError" },
    );
  });
});