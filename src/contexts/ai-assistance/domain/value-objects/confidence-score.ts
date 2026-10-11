// src/contexts/ai-assistance/domain/value-objects/confidence-score.ts
import { InvalidConfidenceScoreError } from "../errors/invalid-confidence-score.error.js";

class ConfidenceScore {
  private constructor(readonly value: number) {}

  static create(value: number): ConfidenceScore {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new InvalidConfidenceScoreError(value);
    }
    return new ConfidenceScore(value);
  }

  equals(other: ConfidenceScore): boolean {
    return this.value === other.value;
  }
}

export { ConfidenceScore };
