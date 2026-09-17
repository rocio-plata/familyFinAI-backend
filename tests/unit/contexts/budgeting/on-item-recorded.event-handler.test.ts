// tests/contexts/budgeting/on-item-recorded.event-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { OnItemRecordedEventHandler } from "../../../src/contexts/budgeting/application/event-handlers/on-item-recorded.event-handler.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { BudgetPeriodStatus } from "../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { ItemRecorded } from "../../../src/contexts/financial-tracking/domain/events/item-recorded.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryBudgetConfigurationRepository } from "./doubles/in-memory-budget-configuration.repository.js";
import { InMemoryBudgetPeriodStatusRepository } from "./doubles/in-memory-budget-period-status.repository.js";

describe("OnItemRecordedEventHandler de Budgeting", () => {
  test("crea un status para un gasto usando el override del período", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const categoryId = CategoryId.generate();
    const period = Period.of(2026, 8);
    const configuration = BudgetConfiguration.create(
      family.id,
      categoryId,
      Money.of(100_000, Currency.default()),
    );
    configuration.setOverrideForPeriod(period, Money.of(60_000, Currency.default()));
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    await configurationRepository.save(configuration);
    const handler = new OnItemRecordedEventHandler(configurationRepository, statusRepository);

    await handler.handle(
      new ItemRecorded(
        FinancialItemId.generate(),
        family.id.toString(),
        categoryId,
        null,
        25_000,
        FinancialItemType.Expense,
        new Date("2026-08-15T12:00:00.000Z"),
        "CLP",
      ),
    );

    const status = await statusRepository.findByFamilyIdCategoryIdAndPeriod(
      family.id,
      categoryId,
      period,
    );
    assert.equal(status?.limitAmount.amount, 60_000);
    assert.equal(status?.spent.amount, 25_000);
  });

  test("acumula un gasto en el status existente", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const categoryId = CategoryId.generate();
    const period = Period.of(2026, 8);
    const configuration = BudgetConfiguration.create(
      family.id,
      categoryId,
      Money.of(100_000, Currency.default()),
    );
    const status = BudgetPeriodStatus.create(
      family.id,
      categoryId,
      period,
      Money.of(100_000, Currency.default()),
    );
    status.registerSpending(Money.of(20_000, Currency.default()));
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    await configurationRepository.save(configuration);
    await statusRepository.save(status);
    const handler = new OnItemRecordedEventHandler(configurationRepository, statusRepository);

    await handler.handle(
      new ItemRecorded(
        FinancialItemId.generate(),
        family.id.toString(),
        categoryId,
        null,
        15_000,
        FinancialItemType.Expense,
        new Date("2026-08-15T12:00:00.000Z"),
        "CLP",
      ),
    );

    assert.equal(status.spent.amount, 35_000);
  });

  test("ignora ingresos y categorías sin configuración activa", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const configuredCategoryId = CategoryId.generate();
    const unconfiguredCategoryId = CategoryId.generate();
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    await configurationRepository.save(
      BudgetConfiguration.create(
        family.id,
        configuredCategoryId,
        Money.of(100_000, Currency.default()),
      ),
    );
    const handler = new OnItemRecordedEventHandler(configurationRepository, statusRepository);

    for (const categoryId of [configuredCategoryId, unconfiguredCategoryId]) {
      await handler.handle(
        new ItemRecorded(
          FinancialItemId.generate(),
          family.id.toString(),
          categoryId,
          null,
          25_000,
          FinancialItemType.Income,
          new Date("2026-08-15T12:00:00.000Z"),
          "CLP",
        ),
      );
    }

    assert.equal(
      await statusRepository.findByFamilyIdCategoryIdAndPeriod(
        family.id,
        configuredCategoryId,
        Period.of(2026, 8),
      ),
      null,
    );
  });
});
