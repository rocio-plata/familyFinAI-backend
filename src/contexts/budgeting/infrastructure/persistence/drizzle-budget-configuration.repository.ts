// src/contexts/budgeting/infrastructure/persistence/drizzle-budget-configuration.repository.ts
import { eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { BudgetConfiguration } from "../../domain/entities/budget-configuration.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import { budgetConfigurations } from "./schema.js";

type PersistedOverride = { amount: number; currency: string };

class DrizzleBudgetConfigurationRepository implements BudgetConfigurationRepository {
  async save(configuration: BudgetConfiguration): Promise<void> {
    const overrides = Object.fromEntries(
      [...configuration.overrides.entries()].map(([period, amount]) => [
        period,
        {
          amount: amount.amount,
          currency: amount.currency.toString(),
        },
      ]),
    );
    await db
      .insert(budgetConfigurations)
      .values({
        id: configuration.id.toString(),
        familyId: configuration.familyId.toString(),
        categoryId: configuration.categoryId.toString(),
        defaultAmount: configuration.defaultAmount.amount.toString(),
        defaultCurrency: configuration.defaultAmount.currency.toString(),
        overrides,
        isActive: configuration.isActive,
      })
      .onConflictDoUpdate({
        target: budgetConfigurations.id,
        set: {
          defaultAmount: configuration.defaultAmount.amount.toString(),
          defaultCurrency: configuration.defaultAmount.currency.toString(),
          overrides,
          isActive: configuration.isActive,
        },
      });
  }

  async findById(id: BudgetConfiguration["id"]): Promise<BudgetConfiguration | null> {
    const row = await db.query.budgetConfigurations.findFirst({
      where: eq(budgetConfigurations.id, id.toString()),
    });
    return row ? this.toDomain(row) : null;
  }

  async findByFamilyId(familyId: FamilyId): Promise<BudgetConfiguration[]> {
    const rows = await db
      .select()
      .from(budgetConfigurations)
      .where(eq(budgetConfigurations.familyId, familyId.toString()));
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: typeof budgetConfigurations.$inferSelect): BudgetConfiguration {
    return BudgetConfiguration.reconstitute({
      id: row.id,
      familyId: row.familyId,
      categoryId: row.categoryId,
      defaultAmount: Number(row.defaultAmount),
      defaultCurrency: row.defaultCurrency,
      overrides: parseOverrides(row.overrides),
      isActive: row.isActive,
    });
  }
}

function parseOverrides(value: unknown): Record<string, PersistedOverride> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, PersistedOverride> = {};
  for (const [period, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const candidate = raw as { amount?: unknown; currency?: unknown };
    if (typeof candidate.amount === "number" && typeof candidate.currency === "string") {
      result[period] = { amount: candidate.amount, currency: candidate.currency };
    }
  }
  return result;
}

export { DrizzleBudgetConfigurationRepository };
