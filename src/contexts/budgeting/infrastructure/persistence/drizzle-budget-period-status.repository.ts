// src/contexts/budgeting/infrastructure/persistence/drizzle-budget-period-status.repository.ts
import { and, eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { BudgetPeriodStatus } from "../../domain/entities/budget-period-status.js";
import type { BudgetPeriodStatusRepository } from "../../domain/repositories/budget-period-status.repository.js";
import { budgetPeriodStatuses } from "./schema.js";

class DrizzleBudgetPeriodStatusRepository implements BudgetPeriodStatusRepository {
  async save(status: BudgetPeriodStatus): Promise<void> {
    await db
      .insert(budgetPeriodStatuses)
      .values({
        id: status.id.toString(),
        familyId: status.familyId.toString(),
        categoryId: status.categoryId.toString(),
        period: status.period.toString(),
        limitAmount: status.limitAmount.amount.toString(),
        spent: status.spent.amount.toString(),
        currency: status.limitAmount.currency.toString(),
      })
      .onConflictDoUpdate({
        target: [
          budgetPeriodStatuses.familyId,
          budgetPeriodStatuses.categoryId,
          budgetPeriodStatuses.period,
        ],
        set: {
          limitAmount: status.limitAmount.amount.toString(),
          spent: status.spent.amount.toString(),
          currency: status.limitAmount.currency.toString(),
        },
      });
  }

  async findByFamilyIdCategoryIdAndPeriod(
    familyId: FamilyId,
    categoryId: CategoryId,
    period: Period,
  ): Promise<BudgetPeriodStatus | null> {
    const row = await db.query.budgetPeriodStatuses.findFirst({
      where: and(
        eq(budgetPeriodStatuses.familyId, familyId.toString()),
        eq(budgetPeriodStatuses.categoryId, categoryId.toString()),
        eq(budgetPeriodStatuses.period, period.toString()),
      ),
    });
    return row
      ? BudgetPeriodStatus.reconstitute({
          id: row.id,
          familyId: row.familyId,
          categoryId: row.categoryId,
          period: row.period,
          limitAmount: Number(row.limitAmount),
          spent: Number(row.spent),
          currency: row.currency,
        })
      : null;
  }
}

export { DrizzleBudgetPeriodStatusRepository };
