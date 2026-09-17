// tests/contexts/budgeting/on-item-amount-changed.event-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { OnItemAmountChangedEventHandler } from "../../../src/contexts/budgeting/application/event-handlers/on-item-amount-changed.event-handler.js";
import { BudgetConfiguration } from "../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { BudgetPeriodStatus } from "../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { ItemAmountChanged } from "../../../src/contexts/financial-tracking/domain/events/item-amount-changed.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryBudgetConfigurationRepository } from "./doubles/in-memory-budget-configuration.repository.js";
import { InMemoryBudgetPeriodStatusRepository } from "./doubles/in-memory-budget-period-status.repository.js";

describe("OnItemAmountChangedEventHandler de Budgeting", () => {
  test("aplica un aumento al gasto acumulado", async () => {
    const { family, categoryId, statusRepository, handler } = await createFixture(20_000);

    await handler.handle(createEvent(family.id, categoryId, 20_000, 35_000));

    const status = await statusRepository.findByFamilyIdCategoryIdAndPeriod(
      family.id,
      categoryId,
      Period.of(2026, 8),
    );
    assert.equal(status?.spent.amount, 35_000);
  });

  test("aplica una reducción al gasto acumulado sin cambiar el límite", async () => {
    const { family, categoryId, statusRepository, handler } = await createFixture(50_000);

    await handler.handle(createEvent(family.id, categoryId, 50_000, 30_000));

    const status = await statusRepository.findByFamilyIdCategoryIdAndPeriod(
      family.id,
      categoryId,
      Period.of(2026, 8),
    );
    assert.equal(status?.spent.amount, 30_000);
    assert.equal(status?.limitAmount.amount, 100_000);
  });

  test("ignora ingresos y categorías sin configuración activa", async () => {
    const family = Family.create(FamilyName.of("Familia"), UserId.generate());
    const categoryId = CategoryId.generate();
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    const configuredCategoryId = CategoryId.generate();
    await configurationRepository.save(
      BudgetConfiguration.create(
        family.id,
        configuredCategoryId,
        Money.of(100_000, Currency.default()),
      ),
    );
    const handler = new OnItemAmountChangedEventHandler(configurationRepository, statusRepository);

    await handler.handle(
      createEvent(family.id, categoryId, 20_000, 30_000, FinancialItemType.Income),
    );
    await handler.handle(createEvent(family.id, categoryId, 20_000, 30_000));

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

async function createFixture(initialSpent: number) {
  const family = Family.create(FamilyName.of("Familia"), UserId.generate());
  const categoryId = CategoryId.generate();
  const configurationRepository = new InMemoryBudgetConfigurationRepository();
  const statusRepository = new InMemoryBudgetPeriodStatusRepository();
  await configurationRepository.save(
    BudgetConfiguration.create(family.id, categoryId, Money.of(100_000, Currency.default())),
  );
  const status = BudgetPeriodStatus.create(
    family.id,
    categoryId,
    Period.of(2026, 8),
    Money.of(100_000, Currency.default()),
  );
  status.registerSpending(Money.of(initialSpent, Currency.default()));
  await statusRepository.save(status);
  return {
    family,
    categoryId,
    statusRepository,
    handler: new OnItemAmountChangedEventHandler(configurationRepository, statusRepository),
  };
}

function createEvent(
  familyId: Family["id"],
  categoryId: CategoryId,
  previousAmount: number,
  newAmount: number,
  type = FinancialItemType.Expense,
): ItemAmountChanged {
  return new ItemAmountChanged(
    FinancialItemId.generate(),
    familyId.toString(),
    categoryId,
    type,
    new Date("2026-08-15T12:00:00.000Z"),
    previousAmount,
    newAmount,
    "CLP",
  );
}
