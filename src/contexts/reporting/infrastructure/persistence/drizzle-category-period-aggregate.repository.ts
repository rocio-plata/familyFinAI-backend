// src/contexts/reporting/infrastructure/persistence/drizzle-category-period-aggregate.repository.ts
import { and, eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { CategoryPeriodAggregate } from "../../domain/entities/category-period-aggregate.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";
import { categoryPeriodAggregates } from "./schema.js";

class DrizzleCategoryPeriodAggregateRepository implements CategoryPeriodAggregateRepository {
  async save(aggregate: CategoryPeriodAggregate): Promise<void> {
    await db
      .insert(categoryPeriodAggregates)
      .values({
        familyId: aggregate.familyId.toString(),
        categoryId: aggregate.categoryId.toString(),
        period: aggregate.period.toString(),
        totalExpense: aggregate.totalExpense.amount.toString(),
        totalIncome: aggregate.totalIncome.amount.toString(),
        currency: aggregate.totalExpense.currency.toString(),
        itemCount: aggregate.itemCount.value,
      })
      .onConflictDoUpdate({
        target: [
          categoryPeriodAggregates.familyId,
          categoryPeriodAggregates.categoryId,
          categoryPeriodAggregates.period,
        ],
        set: {
          totalExpense: aggregate.totalExpense.amount.toString(),
          totalIncome: aggregate.totalIncome.amount.toString(),
          currency: aggregate.totalExpense.currency.toString(),
          itemCount: aggregate.itemCount.value,
        },
      });
  }

  async findByFamilyIdAndPeriod(
    familyId: FamilyId,
    period: Period,
  ): Promise<CategoryPeriodAggregate[]> {
    const rows = await db
      .select()
      .from(categoryPeriodAggregates)
      .where(
        and(
          eq(categoryPeriodAggregates.familyId, familyId.toString()),
          eq(categoryPeriodAggregates.period, period.toString()),
        ),
      );

    return rows.map((row) =>
      CategoryPeriodAggregate.reconstitute({
        familyId: FamilyId.of(row.familyId),
        categoryId: CategoryId.of(row.categoryId),
        period: Period.of(Number(row.period.slice(0, 4)), Number(row.period.slice(5, 7))),
        currency: Currency.of(row.currency),
        totalExpense: Number(row.totalExpense),
        totalIncome: Number(row.totalIncome),
        itemCount: row.itemCount,
      }),
    );
  }
}

export { DrizzleCategoryPeriodAggregateRepository };
