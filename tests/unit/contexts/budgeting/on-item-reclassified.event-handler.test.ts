// tests/contexts/budgeting/on-item-reclassified.event-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { OnItemReclassifiedEventHandler } from "../../../src/contexts/budgeting/application/event-handlers/on-item-reclassified.event-handler.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { BudgetPeriodStatus } from "../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { ItemReclassified } from "../../../src/contexts/financial-tracking/domain/events/item-reclassified.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryBudgetConfigurationRepository } from "./doubles/in-memory-budget-configuration.repository.js";
import { InMemoryBudgetPeriodStatusRepository } from "./doubles/in-memory-budget-period-status.repository.js";

describe("OnItemReclassifiedEventHandler de Budgeting", () => {
  test("mueve el gasto del status de origen al status de destino", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const previousCategoryId = CategoryId.generate();
    const newCategoryId = CategoryId.generate();
    const period = Period.of(2026, 8);
    const currency = Currency.default();
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    await configurationRepository.save(
      BudgetConfiguration.create(family.id, previousCategoryId, Money.of(100_000, currency)),
    );
    await configurationRepository.save(
      BudgetConfiguration.create(family.id, newCategoryId, Money.of(120_000, currency)),
    );
    const previousStatus = BudgetPeriodStatus.create(
      family.id,
      previousCategoryId,
      period,
      Money.of(100_000, currency),
    );
    previousStatus.registerSpending(Money.of(25_000, currency));
    await statusRepository.save(previousStatus);
    const handler = new OnItemReclassifiedEventHandler(configurationRepository, statusRepository);

    await handler.handle(
      new ItemReclassified(
        FinancialItemId.generate(),
        family.id.toString(),
        previousCategoryId,
        newCategoryId,
        null,
        null,
        FinancialItemType.Expense,
        new Date("2026-08-15T12:00:00.000Z"),
        25_000,
        "CLP",
      ),
    );

    const updatedPrevious = await statusRepository.findByFamilyIdCategoryIdAndPeriod(
      family.id,
      previousCategoryId,
      period,
    );
    const updatedNew = await statusRepository.findByFamilyIdCategoryIdAndPeriod(
      family.id,
      newCategoryId,
      period,
    );
    assert.equal(updatedPrevious?.spent.amount, 0);
    assert.equal(updatedNew?.limitAmount.amount, 120_000);
    assert.equal(updatedNew?.spent.amount, 25_000);
  });

  test("ignora ingresos y no crea destino sin presupuesto", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const previousCategoryId = CategoryId.generate();
    const newCategoryId = CategoryId.generate();
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    await configurationRepository.save(
      BudgetConfiguration.create(
        family.id,
        previousCategoryId,
        Money.of(100_000, Currency.default()),
      ),
    );
    const previousStatus = BudgetPeriodStatus.create(
      family.id,
      previousCategoryId,
      Period.of(2026, 8),
      Money.of(100_000, Currency.default()),
    );
    previousStatus.registerSpending(Money.of(25_000, Currency.default()));
    await statusRepository.save(previousStatus);
    const handler = new OnItemReclassifiedEventHandler(configurationRepository, statusRepository);

    await handler.handle(
      new ItemReclassified(
        FinancialItemId.generate(),
        family.id.toString(),
        previousCategoryId,
        newCategoryId,
        null,
        null,
        FinancialItemType.Income,
        new Date("2026-08-15T12:00:00.000Z"),
        25_000,
        "CLP",
      ),
    );

    assert.equal(previousStatus.spent.amount, 25_000);
    assert.equal(
      await statusRepository.findByFamilyIdCategoryIdAndPeriod(
        family.id,
        newCategoryId,
        Period.of(2026, 8),
      ),
      null,
    );
  });
});
