// tests/integration/contexts/reporting/infrastructure/persistence/category-period-aggregate.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { CategoryPeriodAggregate } from "../../../../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { DrizzleCategoryPeriodAggregateRepository } from "../../../../../../src/contexts/reporting/infrastructure/persistence/drizzle-category-period-aggregate.repository.js";
import { categoryPeriodAggregates } from "../../../../../../src/contexts/reporting/infrastructure/persistence/schema.js";
import { db } from "../../../../../../src/platform/db/connection.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../../src/shared-kernel/domain/money.js";
import { Period } from "../../../../../../src/shared-kernel/domain/period.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const repository = new DrizzleCategoryPeriodAggregateRepository();
const createdKeys: { familyId: string; categoryId: string; period: string }[] = [];

after(async () => {
  if (!hasDatabase) return;
  for (const key of createdKeys) {
    await db
      .delete(categoryPeriodAggregates)
      .where(
        and(
          eq(categoryPeriodAggregates.familyId, key.familyId),
          eq(categoryPeriodAggregates.categoryId, key.categoryId),
          eq(categoryPeriodAggregates.period, key.period),
        ),
      );
  }
});

describe("Persistencia Drizzle de agregados de categoría por período (integración)", () => {
  test("guarda, acumula un movimiento y recupera el agregado", { skip }, async () => {
    const familyId = FamilyId.generate();
    const categoryId = CategoryId.generate();
    const period = Period.of(2026, 3);
    const currency = Currency.of("CLP");
    const aggregate = CategoryPeriodAggregate.create(familyId, categoryId, period, currency);
    createdKeys.push({
      familyId: familyId.toString(),
      categoryId: categoryId.toString(),
      period: period.toString(),
    });

    aggregate.registerItem(FinancialItemType.Expense, Money.of(5000, currency));
    await repository.save(aggregate);

    const found = await repository.findByFamilyIdAndPeriod(familyId, period);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.totalExpense.amount, 5000);
    assert.equal(found[0]?.itemCount.value, 1);
  });
});
