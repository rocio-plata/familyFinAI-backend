// tests/contexts/budgeting/set-budget-override-for-period.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { SetBudgetOverrideForPeriodUseCase } from "../../../src/contexts/budgeting/application/commands/set-budget-override-for-period.usecase.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { BudgetPeriodStatus } from "../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";

describe("SetBudgetOverrideForPeriodUseCase", () => {
  test("guarda el override y actualiza el estado mensual existente", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const categoryId = CategoryId.generate();
    const period = Period.of(2026, 8);
    const currency = Currency.default();
    const configuration = BudgetConfiguration.create(
      family.id,
      categoryId,
      Money.of(100_000, currency),
    );
    const status = BudgetPeriodStatus.create(
      family.id,
      categoryId,
      period,
      Money.of(100_000, currency),
    );
    status.registerSpending(Money.of(80_000, currency));
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    await configurationRepository.save(configuration);
    await statusRepository.save(status);
    const useCase = new SetBudgetOverrideForPeriodUseCase(
      configurationRepository,
      statusRepository,
    );

    await useCase.execute({
      familyId: family.id,
      budgetConfigurationId: configuration.id,
      period,
      overrideAmount: Money.of(60_000, currency),
    });

    assert.equal(configuration.resolveAmountFor(period).amount, 60_000);
    assert.equal(
      (await statusRepository.findByFamilyIdCategoryIdAndPeriod(family.id, categoryId, period))
        ?.limitAmount.amount,
      60_000,
    );
    assert.equal(status.spent.amount, 80_000);
  });

  test("no crea un estado mensual si todavía no existe", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const categoryId = CategoryId.generate();
    const period = Period.of(2026, 8);
    const configuration = BudgetConfiguration.create(
      family.id,
      categoryId,
      Money.of(100_000, Currency.default()),
    );
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    await configurationRepository.save(configuration);
    const useCase = new SetBudgetOverrideForPeriodUseCase(
      configurationRepository,
      statusRepository,
    );

    await useCase.execute({
      familyId: family.id,
      budgetConfigurationId: configuration.id,
      period,
      overrideAmount: Money.of(60_000, Currency.default()),
    });

    assert.equal(
      await statusRepository.findByFamilyIdCategoryIdAndPeriod(family.id, categoryId, period),
      null,
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

class InMemoryBudgetPeriodStatusRepository {
  private readonly statuses = new Map<string, BudgetPeriodStatus>();

  async save(status: BudgetPeriodStatus): Promise<void> {
    this.statuses.set(this.key(status.familyId, status.categoryId, status.period), status);
  }

  async findByFamilyIdCategoryIdAndPeriod(
    familyId: Family["id"],
    categoryId: CategoryId,
    period: Period,
  ): Promise<BudgetPeriodStatus | null> {
    return this.statuses.get(this.key(familyId, categoryId, period)) ?? null;
  }

  private key(familyId: Family["id"], categoryId: CategoryId, period: Period): string {
    return `${familyId.toString()}:${categoryId.toString()}:${period.toString()}`;
  }
}
