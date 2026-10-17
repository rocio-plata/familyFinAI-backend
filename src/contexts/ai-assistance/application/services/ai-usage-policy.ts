// src/contexts/ai-assistance/application/services/ai-usage-policy.ts
import { AiUsageLimitExceededError } from "../../domain/errors/ai-usage-limit-exceeded.error.js";
import type { AiUsageRepository } from "../../domain/repositories/ai-usage.repository.js";

const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 30);
const AI_USAGE_TIMEZONE = process.env.AI_USAGE_TIMEZONE ?? "America/Santiago";

class AiUsagePolicy {
  constructor(private readonly repository: AiUsageRepository) {}

  async assertAvailable(userId: string, now = new Date()): Promise<void> {
    const day = this.dayOf(now);
    const used = await this.repository.countForUserOnDay(userId, day);
    if (used >= AI_DAILY_LIMIT) {
      throw new AiUsageLimitExceededError(AI_DAILY_LIMIT, used, this.nextDay(now));
    }
  }

  async consume(userId: string, now = new Date()): Promise<void> {
    await this.repository.increment(userId, this.dayOf(now));
  }

  async status(userId: string, now = new Date()) {
    const used = await this.repository.countForUserOnDay(userId, this.dayOf(now));
    return {
      limit: AI_DAILY_LIMIT,
      used,
      remaining: Math.max(0, AI_DAILY_LIMIT - used),
      resetsAt: this.nextDay(now).toISOString(),
    };
  }

  private dayOf(date: Date): string {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: AI_USAGE_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
  }

  private nextDay(date: Date): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(0, 0, 0, 0);
    return next;
  }
}

export { AI_DAILY_LIMIT, AI_USAGE_TIMEZONE, AiUsagePolicy };
