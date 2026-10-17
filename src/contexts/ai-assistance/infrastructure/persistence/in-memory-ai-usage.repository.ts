// src/contexts/ai-assistance/infrastructure/persistence/in-memory-ai-usage.repository.ts
import type { AiUsageRepository } from "../../domain/repositories/ai-usage.repository.js";

class InMemoryAiUsageRepository implements AiUsageRepository {
  private readonly usage = new Map<string, number>();

  async countForUserOnDay(userId: string, day: string): Promise<number> {
    return this.usage.get(`${userId}:${day}`) ?? 0;
  }

  async increment(userId: string, day: string): Promise<void> {
    const key = `${userId}:${day}`;
    this.usage.set(key, (this.usage.get(key) ?? 0) + 1);
  }
}

export { InMemoryAiUsageRepository };
