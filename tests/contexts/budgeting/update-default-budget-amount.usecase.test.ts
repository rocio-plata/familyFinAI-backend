// tests/contexts/budgeting/update-default-budget-amount.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { UpdateDefaultBudgetAmountUseCase } from "../../../src/contexts/budgeting/application/commands/update-default-budget-amount.usecase.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";

describe("UpdateDefaultBudgetAmountUseCase", () => {
  test("actualiza y persiste el monto por defecto", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const budget = BudgetConfiguration.create(
      family.id,
      CategoryId.generate(),
      Money.of(100_000, Currency.default()),
    );
    const repository = new InMemoryBudgetConfigurationRepository();
    await repository.save(budget);
    const useCase = new UpdateDefaultBudgetAmountUseCase(repository);

    const updated = await useCase.execute({
      familyId: family.id,
      budgetConfigurationId: budget.id,
      newDefaultAmount: Money.of(150_000, Currency.default()),
    });

    assert.equal(updated.defaultAmount.amount, 150_000);
    assert.equal((await repository.findById(budget.id))?.defaultAmount.amount, 150_000);
  });

  test("rechaza una configuración que pertenece a otra familia", async () => {
    const owner = UserId.generate();
    const family = Family.create(FamilyName.of("Familia"), owner);
    const otherFamily = Family.create(FamilyName.of("Otra familia"), UserId.generate());
    const budget = BudgetConfiguration.create(
      otherFamily.id,
      CategoryId.generate(),
      Money.of(100_000, Currency.default()),
    );
    const repository = new InMemoryBudgetConfigurationRepository();
    await repository.save(budget);
    const useCase = new UpdateDefaultBudgetAmountUseCase(repository);

    await assert.rejects(
      useCase.execute({
        familyId: family.id,
        budgetConfigurationId: budget.id,
        newDefaultAmount: Money.of(150_000, Currency.default()),
      }),
      { name: "BudgetConfigurationNotFoundError" },
    );
  });

  test("rechaza una configuración inexistente", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const useCase = new UpdateDefaultBudgetAmountUseCase(
      new InMemoryBudgetConfigurationRepository(),
    );

    await assert.rejects(
      useCase.execute({
        familyId: family.id,
        budgetConfigurationId: BudgetConfiguration.create(
          family.id,
          CategoryId.generate(),
          Money.of(100_000, Currency.default()),
        ).id,
        newDefaultAmount: Money.of(150_000, Currency.default()),
      }),
      { name: "BudgetConfigurationNotFoundError" },
    );
  });
});

class InMemoryBudgetConfigurationRepository {
  private readonly budgets = new Map<string, BudgetConfiguration>();

  async save(budget: BudgetConfiguration): Promise<void> {
    this.budgets.set(budget.id.toString(), budget);
  }

  async findById(id: BudgetConfiguration["id"]): Promise<BudgetConfiguration | null> {
    return this.budgets.get(id.toString()) ?? null;
  }
}