// tests/integration/contexts/budgeting/infrastructure/persistence/budget-configuration.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { BudgetConfiguration } from "../../../../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { DrizzleBudgetConfigurationRepository } from "../../../../../../src/contexts/budgeting/infrastructure/persistence/drizzle-budget-configuration.repository.js";
import { budgetConfigurations } from "../../../../../../src/contexts/budgeting/infrastructure/persistence/schema.js";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { db } from "../../../../../../src/platform/db/connection.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../../../src/shared-kernel/domain/period.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const repository = new DrizzleBudgetConfigurationRepository();
const createdIds: string[] = [];

after(async () => {
  if (!hasDatabase) return;
  for (const id of createdIds) {
    await db.delete(budgetConfigurations).where(eq(budgetConfigurations.id, id));
  }
});

describe("Persistencia Drizzle de configuraciones de presupuesto (integración)", () => {
  test("guarda, busca y actualiza una configuración con overrides", { skip }, async () => {
    const familyId = FamilyId.generate();
    const categoryId = CategoryId.generate();
    const configuration = BudgetConfiguration.create(
      familyId,
      categoryId,
      Money.of(100000, Currency.of("CLP")),
    );
    createdIds.push(configuration.id.toString());

    await repository.save(configuration);
    const found = await repository.findById(configuration.id);
    assert.ok(found);
    assert.equal(found.defaultAmount.amount, 100000);

    configuration.setOverrideForPeriod(Period.of(2026, 1), Money.of(150000, Currency.of("CLP")));
    configuration.deactivate();
    await repository.save(configuration);

    const updated = await repository.findById(configuration.id);
    assert.equal(updated?.isActive, false);
    assert.equal(updated?.overrides.get("2026-01")?.amount, 150000);

    const byFamily = await repository.findByFamilyId(familyId);
    assert.equal(byFamily.length, 1);
  });
});
