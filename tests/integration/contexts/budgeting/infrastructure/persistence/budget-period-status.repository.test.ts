// tests/integration/contexts/budgeting/infrastructure/persistence/budget-period-status.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { BudgetPeriodStatus } from "../../../../../../src/contexts/budgeting/domain/entities/budget-period-status.js";
import { DrizzleBudgetPeriodStatusRepository } from "../../../../../../src/contexts/budgeting/infrastructure/persistence/drizzle-budget-period-status.repository.js";
import { budgetPeriodStatuses } from "../../../../../../src/contexts/budgeting/infrastructure/persistence/schema.js";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { db } from "../../../../../../src/platform/db/connection.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../../../src/shared-kernel/domain/period.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const repository = new DrizzleBudgetPeriodStatusRepository();
const createdIds: string[] = [];

after(async () => {
  if (!hasDatabase) return;
  for (const id of createdIds) {
    await db.delete(budgetPeriodStatuses).where(eq(budgetPeriodStatuses.id, id));
  }
});

describe("Persistencia Drizzle de estado de presupuesto por período (integración)", () => {
  test("guarda y busca por familia, categoría y período", { skip }, async () => {
    const familyId = FamilyId.generate();
    const categoryId = CategoryId.generate();
    const period = Period.of(2026, 2);
    const status = BudgetPeriodStatus.create(
      familyId,
      categoryId,
      period,
      Money.of(80000, Currency.of("CLP")),
    );
    createdIds.push(status.id.toString());

    await repository.save(status);

    const found = await repository.findByFamilyIdCategoryIdAndPeriod(familyId, categoryId, period);
    assert.ok(found);
    assert.equal(found.limitAmount.amount, 80000);
    assert.equal(found.spent.amount, 0);
  });
});
