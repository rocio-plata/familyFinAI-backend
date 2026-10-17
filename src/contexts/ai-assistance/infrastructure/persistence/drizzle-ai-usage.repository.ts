// src/contexts/ai-assistance/infrastructure/persistence/drizzle-ai-usage.repository.ts
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import type { AiUsageRepository } from "../../domain/repositories/ai-usage.repository.js";
import { aiUsage } from "./schema.js";

class DrizzleAiUsageRepository implements AiUsageRepository {
  async countForUserOnDay(userId: string, day: string): Promise<number> {
    const row = await db
      .select({ used: aiUsage.used })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day)))
      .limit(1);
    return row[0]?.used ?? 0;
  }

  async increment(userId: string, day: string): Promise<void> {
    await db
      .insert(aiUsage)
      .values({ userId, day, used: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.userId, aiUsage.day],
        set: { used: sql`${aiUsage.used} + 1` },
      });
  }
}

export { DrizzleAiUsageRepository };
