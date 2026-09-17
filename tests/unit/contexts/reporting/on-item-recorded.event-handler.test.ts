// tests/contexts/reporting/on-item-recorded.event-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { ItemRecorded } from "../../../src/contexts/financial-tracking/domain/events/item-recorded.event.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { OnItemRecordedEventHandler } from "../../../src/contexts/reporting/application/event-handlers/on-item-recorded.event-handler.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("OnItemRecordedEventHandler", () => {
  test("crea un agregado y registra un gasto en su período", async () => {
    const repository = new InMemoryCategoryPeriodAggregateRepository();
    const handler = new OnItemRecordedEventHandler(repository);
    const familyId = FamilyId.generate();
    const categoryId = CategoryId.generate();

    await handler.handle(
      new ItemRecorded(
        FinancialItemId.generate(),
        familyId.toString(),
        categoryId,
        null,
        25_000,
        FinancialItemType.Expense,
        new Date("2026-08-15T12:00:00.000Z"),
        "CLP",
      ),
    );

    const [aggregate] = await repository.findByFamilyIdAndPeriod(familyId, Period.of(2026, 8));
    assert.equal(aggregate.categoryId.toString(), categoryId.toString());
    assert.equal(aggregate.totalExpense.amount, 25_000);
    assert.equal(aggregate.itemCount.value, 1);
  });

  test("actualiza el agregado existente para un ingreso", async () => {
    const repository = new InMemoryCategoryPeriodAggregateRepository();
    const handler = new OnItemRecordedEventHandler(repository);
    const familyId = FamilyId.generate();
    const categoryId = CategoryId.generate();
    const event = () =>
      new ItemRecorded(
        FinancialItemId.generate(),
        familyId.toString(),
        categoryId,
        null,
        100_000,
        FinancialItemType.Income,
        new Date("2026-08-15T12:00:00.000Z"),
        "CLP",
      );

    await handler.handle(event());
    await handler.handle(event());

    const [aggregate] = await repository.findByFamilyIdAndPeriod(familyId, Period.of(2026, 8));
    assert.equal(aggregate.totalIncome.amount, 200_000);
    assert.equal(aggregate.itemCount.value, 2);
  });
});
