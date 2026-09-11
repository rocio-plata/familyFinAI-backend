// tests/contexts/reporting/on-item-deleted.event-handler.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemId } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { ItemDeleted } from "../../../src/contexts/financial-tracking/domain/events/item-deleted.event.js";
import { Money } from "../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { OnItemDeletedEventHandler } from "../../../src/contexts/reporting/application/event-handlers/on-item-deleted.event-handler.js";
import { CategoryPeriodAggregate } from "../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryPeriodAggregateRepository } from "./doubles/in-memory-category-period-aggregate.repository.js";

describe("OnItemDeletedEventHandler", () => {
  test("resta el gasto y decrementa la cantidad de movimientos", async () => {
    const repository = new InMemoryCategoryPeriodAggregateRepository();
    const handler = new OnItemDeletedEventHandler(repository);
    const familyId = FamilyId.generate();
    const categoryId = CategoryId.generate();
    const aggregate = CategoryPeriodAggregate.create(
      familyId,
      categoryId,
      Period.of(2026, 8),
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Expense, Money.of(25_000, Currency.default()));
    await repository.save(aggregate);

    await handler.handle(
      new ItemDeleted(
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

    const [updated] = await repository.findByFamilyIdAndPeriod(familyId, Period.of(2026, 8));
    assert.equal(updated.totalExpense.amount, 0);
    assert.equal(updated.itemCount.value, 0);
  });

  test("resta un ingreso del agregado correspondiente", async () => {
    const repository = new InMemoryCategoryPeriodAggregateRepository();
    const handler = new OnItemDeletedEventHandler(repository);
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
      new ItemDeleted(
        FinancialItemId.generate(),
        familyId.toString(),
        categoryId,
        null,
        100_000,
        FinancialItemType.Income,
        new Date("2026-08-15T12:00:00.000Z"),
        "CLP",
      ),
    );

    const [updated] = await repository.findByFamilyIdAndPeriod(familyId, Period.of(2026, 8));
    assert.equal(updated.totalIncome.amount, 0);
    assert.equal(updated.itemCount.value, 0);
  });
});