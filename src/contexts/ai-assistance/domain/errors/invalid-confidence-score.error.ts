// src/contexts/ai-assistance/domain/errors/invalid-confidence-score.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidConfidenceScoreError extends DomainError {
  readonly code = "AI_ASSISTANCE.INVALID_CONFIDENCE_SCORE";

  constructor(value: number) {
    super(`La confianza '${value}' debe estar entre 0 y 1`);
  }
}

export { InvalidConfidenceScoreError };
