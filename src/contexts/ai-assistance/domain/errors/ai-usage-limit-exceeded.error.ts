// src/contexts/ai-assistance/domain/errors/ai-usage-limit-exceeded.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class AiUsageLimitExceededError extends DomainError {
  readonly code = "AI.USAGE_LIMIT_EXCEEDED";

  constructor(
    readonly limit: number,
    readonly used: number,
    readonly resetsAt: Date,
  ) {
    super("Alcanzaste el límite diario de uso de IA");
  }

  get details(): { limit: number; used: number; resetsAt: string } {
    return { limit: this.limit, used: this.used, resetsAt: this.resetsAt.toISOString() };
  }
}

export { AiUsageLimitExceededError };
