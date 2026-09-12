// tests/contexts/budgeting/deactivate-budget-configuration.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DeactivateBudgetConfigurationUseCase } from "../../../src/contexts/budgeting/application/commands/deactivate-budget-configuration.usecase.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { InMemoryBudgetConfigurationRepository } from "./doubles/in-memory-budget-configuration.repository.js";

describe("DeactivateBudgetConfigurationUseCase", () => {
  test("desactiva y persiste la configuración", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const budget = BudgetConfiguration.create(
      family.id,
      CategoryId.generate(),
      Money.of(100_000, Currency.default()),
    );
    const repository = new InMemoryBudgetConfigurationRepository();
    await repository.save(budget);
    const useCase = new DeactivateBudgetConfigurationUseCase(repository);

    const result = await useCase.execute({
      familyId: family.id,
      budgetConfigurationId: budget.id,
    });

    assert.equal(result.isActive, false);
    assert.equal((await repository.findById(budget.id))?.isActive, false);
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
    const useCase = new DeactivateBudgetConfigurationUseCase(repository);

    await assert.rejects(
      useCase.execute({
        familyId: family.id,
        budgetConfigurationId: budget.id,
      }),
      { name: "BudgetConfigurationNotFoundError" },
    );
  });

  test("rechaza una configuración inexistente", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const budget = BudgetConfiguration.create(
      family.id,
      CategoryId.generate(),
      Money.of(100_000, Currency.default()),
    );
    const useCase = new DeactivateBudgetConfigurationUseCase(
      new InMemoryBudgetConfigurationRepository(),
    );

    await assert.rejects(
      useCase.execute({
        familyId: family.id,
        budgetConfigurationId: budget.id,
      }),
      { name: "BudgetConfigurationNotFoundError" },
    );
  });
});
