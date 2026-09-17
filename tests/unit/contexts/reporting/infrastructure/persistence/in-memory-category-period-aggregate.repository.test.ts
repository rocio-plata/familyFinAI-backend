// tests/contexts/reporting/infrastructure/persistence/in-memory-category-period-aggregate.repository.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { CategoryPeriodAggregate } from "../../../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { InMemoryCategoryPeriodAggregateRepository } from "../../../../../src/contexts/reporting/infrastructure/persistence/in-memory-category-period-aggregate.repository.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../../src/shared-kernel/domain/period.js";

describe("InMemoryCategoryPeriodAggregateRepository", () => {
  test("guarda y recupera agregados por familia y período", async () => {
    const repository = new InMemoryCategoryPeriodAggregateRepository();
    const familyId = FamilyId.generate();
    const period = Period.of(2026, 8);
    const aggregate = CategoryPeriodAggregate.create(
      familyId,
      CategoryId.generate(),
      period,
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Expense, Money.of(25_000, Currency.default()));

    await repository.save(aggregate);

    const result = await repository.findByFamilyIdAndPeriod(familyId, period);
    assert.equal(result.length, 1);
    assert.equal(result[0].totalExpense.amount, 25_000);
  });

  test("actualiza el agregado existente al guardar la misma clave", async () => {
    const repository = new InMemoryCategoryPeriodAggregateRepository();
    const familyId = FamilyId.generate();
    const categoryId = CategoryId.generate();
    const period = Period.of(2026, 8);
    const first = CategoryPeriodAggregate.create(familyId, categoryId, period, Currency.default());
    const second = CategoryPeriodAggregate.create(familyId, categoryId, period, Currency.default());
    second.registerItem(FinancialItemType.Income, Money.of(100_000, Currency.default()));

    await repository.save(first);
    await repository.save(second);

    const result = await repository.findByFamilyIdAndPeriod(familyId, period);
    assert.equal(result.length, 1);
    assert.equal(result[0].totalIncome.amount, 100_000);
  });
});
