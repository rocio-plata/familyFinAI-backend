// src/contexts/ai-assistance/infrastructure/persistence/drizzle-merchant-category-history.repository.ts
import { and, eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import { MerchantCategoryHistory } from "../../domain/entities/merchant-category-history.js";
import type { MerchantCategoryHistoryRepository } from "../../domain/repositories/merchant-category-history.repository.js";
import type { MerchantName } from "../../domain/value-objects/merchant-name.js";
import { merchantCategoryHistory } from "./schema.js";

class DrizzleMerchantCategoryHistoryRepository implements MerchantCategoryHistoryRepository {
  async save(history: MerchantCategoryHistory): Promise<void> {
    await db
      .insert(merchantCategoryHistory)
      .values({
        id: history.id,
        familyId: history.familyId,
        merchantName: history.merchantName.toString(),
        categoryId: history.categoryId,
        tagId: history.tagId,
        timesUsed: history.timesUsed,
      })
      .onConflictDoUpdate({
        target: [merchantCategoryHistory.familyId, merchantCategoryHistory.merchantName],
        set: {
          categoryId: history.categoryId,
          tagId: history.tagId,
          timesUsed: history.timesUsed,
        },
      });
  }

  async findByMerchant(
    familyId: string,
    merchantName: MerchantName,
  ): Promise<MerchantCategoryHistory | null> {
    const row = (
      await db
        .select()
        .from(merchantCategoryHistory)
        .where(
          and(
            eq(merchantCategoryHistory.familyId, familyId),
            eq(merchantCategoryHistory.merchantName, merchantName.toString()),
          ),
        )
        .limit(1)
    )[0];
    return row
      ? MerchantCategoryHistory.reconstitute({
          id: row.id,
          familyId: row.familyId,
          merchantName: row.merchantName,
          categoryId: row.categoryId,
          tagId: row.tagId,
          timesUsed: row.timesUsed,
        })
      : null;
  }
}

export { DrizzleMerchantCategoryHistoryRepository };
