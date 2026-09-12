// tests/contexts/budgeting/infrastructure/persistence/in-memory-budget-repositories.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { BudgetConfiguration } from "../../../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { BudgetPeriodStatus } from "../../../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import { InMemoryBudgetConfigurationRepository } from "../../../../../src/contexts/budgeting/infrastructure/persistence/in-memory-budget-configuration.repository.js";
import { InMemoryBudgetPeriodStatusRepository } from "../../../../../src/contexts/budgeting/infrastructure/persistence/in-memory-budget-period-status.repository.js";
import { Family } from "../../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CategoryId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../../src/shared-kernel/domain/period.js";

describe("InMemory Budgeting repositories", () => {
  test("guarda y recupera configuraciones por familia", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const repository = new InMemoryBudgetConfigurationRepository();
    const configuration = BudgetConfiguration.create(
      family.id,
      CategoryId.generate(),
      Money.of(100_000, Currency.default()),
    );

    await repository.save(configuration);

    assert.equal(
      (await repository.findById(configuration.id))?.id.toString(),
      configuration.id.toString(),
    );
    assert.equal((await repository.findByFamilyId(family.id)).length, 1);
  });

  test("actualiza el status existente por familia, categoría y período", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const categoryId = CategoryId.generate();
    const period = Period.of(2026, 8);
    const repository = new InMemoryBudgetPeriodStatusRepository();
    const status = BudgetPeriodStatus.create(
      family.id,
      categoryId,
      period,
      Money.of(100_000, Currency.default()),
    );
    status.registerSpending(Money.of(25_000, Currency.default()));

    await repository.save(status);

    const result = await repository.findByFamilyIdCategoryIdAndPeriod(
      family.id,
      categoryId,
      period,
    );
    assert.equal(result?.spent.amount, 25_000);
  });
});
