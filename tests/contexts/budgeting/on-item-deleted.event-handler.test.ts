// tests/contexts/budgeting/on-item-deleted.event-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { OnItemDeletedEventHandler } from "../../../src/contexts/budgeting/application/event-handlers/on-item-deleted.event-handler.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { BudgetPeriodStatus } from "../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { ItemDeleted } from "../../../src/contexts/financial-tracking/domain/events/item-deleted.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryBudgetConfigurationRepository } from "./doubles/in-memory-budget-configuration.repository.js";
import { InMemoryBudgetPeriodStatusRepository } from "./doubles/in-memory-budget-period-status.repository.js";

describe("OnItemDeletedEventHandler de Budgeting", () => {
  test("resta el gasto del status mensual existente", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const categoryId = CategoryId.generate();
    const period = Period.of(2026, 8);
    const currency = Currency.default();
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    await configurationRepository.save(
      BudgetConfiguration.create(family.id, categoryId, Money.of(100_000, currency)),
    );
    const status = BudgetPeriodStatus.create(
      family.id,
      categoryId,
      period,
      Money.of(100_000, currency),
    );
    status.registerSpending(Money.of(25_000, currency));
    await statusRepository.save(status);
    const handler = new OnItemDeletedEventHandler(configurationRepository, statusRepository);

    await handler.handle(createEvent(family.id, categoryId, 25_000));

    assert.equal(status.spent.amount, 0);
  });

  test("ignora ingresos y eliminaciones sin status", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const categoryId = CategoryId.generate();
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    await configurationRepository.save(
      BudgetConfiguration.create(family.id, categoryId, Money.of(100_000, Currency.default())),
    );
    const handler = new OnItemDeletedEventHandler(configurationRepository, statusRepository);

    await handler.handle(createEvent(family.id, categoryId, 25_000, FinancialItemType.Income));
    await handler.handle(createEvent(family.id, categoryId, 25_000));

    assert.equal(
      await statusRepository.findByFamilyIdCategoryIdAndPeriod(
        family.id,
        categoryId,
        Period.of(2026, 8),
      ),
      null,
    );
  });
});

function createEvent(
  familyId: Family["id"],
  categoryId: CategoryId,
  amount: number,
  type = FinancialItemType.Expense,
): ItemDeleted {
  return new ItemDeleted(
    FinancialItemId.generate(),
    familyId.toString(),
    categoryId,
    null,
    amount,
    type,
    new Date("2026-08-15T12:00:00.000Z"),
    "CLP",
  );
}
