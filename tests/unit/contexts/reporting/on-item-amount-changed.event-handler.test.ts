// tests/contexts/reporting/on-item-amount-changed.event-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { ItemAmountChanged } from "../../../src/contexts/financial-tracking/domain/events/item-amount-changed.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { OnItemAmountChangedEventHandler } from "../../../src/contexts/reporting/application/event-handlers/on-item-amount-changed.event-handler.js";
import { CategoryPeriodAggregate } from "../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("OnItemAmountChangedEventHandler", () => {
  test("ajusta el gasto y conserva la cantidad de movimientos", async () => {
    const repository = new InMemoryCategoryPeriodAggregateRepository();
    const handler = new OnItemAmountChangedEventHandler(repository);
    const familyId = FamilyId.generate();
    const categoryId = CategoryId.generate();
    const aggregate = CategoryPeriodAggregate.create(
      familyId,
      categoryId,
      Period.of(2026, 8),
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Expense, Money.of(10_000, Currency.default()));
    await repository.save(aggregate);

    await handler.handle(
      new ItemAmountChanged(
        FinancialItemId.generate(),
        familyId.toString(),
        categoryId,
        FinancialItemType.Expense,
        new Date("2026-08-15T12:00:00.000Z"),
        10_000,
        15_000,
        "CLP",
      ),
    );

    const [updated] = await repository.findByFamilyIdAndPeriod(familyId, Period.of(2026, 8));
    assert.equal(updated.totalExpense.amount, 15_000);
    assert.equal(updated.itemCount.value, 1);
  });

  test("ajusta un ingreso hacia abajo", async () => {
    const repository = new InMemoryCategoryPeriodAggregateRepository();
    const handler = new OnItemAmountChangedEventHandler(repository);
    const familyId = FamilyId.generate();
    const categoryId = CategoryId.generate();
    const aggregate = CategoryPeriodAggregate.create(
      familyId,
      categoryId,
      Period.of(2026, 8),
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Income, Money.of(100_000, Currency.default()));
    await repository.save(aggregate);

    await handler.handle(
      new ItemAmountChanged(
        FinancialItemId.generate(),
        familyId.toString(),
        categoryId,
        FinancialItemType.Income,
        new Date("2026-08-15T12:00:00.000Z"),
        100_000,
        75_000,
        "CLP",
      ),
    );

    const [updated] = await repository.findByFamilyIdAndPeriod(familyId, Period.of(2026, 8));
    assert.equal(updated.totalIncome.amount, 75_000);
    assert.equal(updated.itemCount.value, 1);
  });
});
