// src/contexts/ai-assistance/domain/repositories/ai-usage.repository.ts
interface AiUsageRepository {
  countForUserOnDay(userId: string, day: string): Promise<number>;
  increment(userId: string, day: string): Promise<void>;
}

export type { AiUsageRepository };
