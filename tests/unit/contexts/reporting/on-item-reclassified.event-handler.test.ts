// tests/contexts/reporting/on-item-reclassified.event-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { ItemReclassified } from "../../../src/contexts/financial-tracking/domain/events/item-reclassified.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { OnItemReclassifiedEventHandler } from "../../../src/contexts/reporting/application/event-handlers/on-item-reclassified.event-handler.js";
import { CategoryPeriodAggregate } from "../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("OnItemReclassifiedEventHandler", () => {
  test("mueve el gasto entre categorías y actualiza sus cantidades", async () => {
    const repository = new InMemoryCategoryPeriodAggregateRepository();
    const handler = new OnItemReclassifiedEventHandler(repository);
    const familyId = FamilyId.generate();
    const previousCategoryId = CategoryId.generate();
    const newCategoryId = CategoryId.generate();
    const period = Period.of(2026, 8);
    const previousAggregate = CategoryPeriodAggregate.create(
      familyId,
      previousCategoryId,
      period,
      Currency.default(),
    );
    previousAggregate.registerItem(FinancialItemType.Expense, Money.of(25_000, Currency.default()));
    await repository.save(previousAggregate);

    await handler.handle(
      new ItemReclassified(
        FinancialItemId.generate(),
        familyId.toString(),
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

    const aggregates = await repository.findByFamilyIdAndPeriod(familyId, period);
    const updatedPrevious = aggregates.find((aggregate) =>
      aggregate.categoryId.equals(previousCategoryId),
    );
    const updatedNew = aggregates.find((aggregate) => aggregate.categoryId.equals(newCategoryId));
    assert.equal(updatedPrevious?.totalExpense.amount, 0);
    assert.equal(updatedPrevious?.itemCount.value, 0);
    assert.equal(updatedNew?.totalExpense.amount, 25_000);
    assert.equal(updatedNew?.itemCount.value, 1);
  });
});
