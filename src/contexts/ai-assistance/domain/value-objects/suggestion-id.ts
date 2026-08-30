// contexts/ai-assistance/domain/value-objects/suggestion-id.ts
import { randomUUID } from "node:crypto";
import { isValidUUID } from "../../../../shared-kernel/domain/uuid.js";

class SuggestionId {
  private constructor(private readonly value: string) {}

  static generate(): SuggestionId {
    return new SuggestionId(randomUUID());
  }

  static of(value: string): SuggestionId {
    if (!isValidUUID(value)) throw new InvalidSuggestionIdError(value);
    return new SuggestionId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: SuggestionId): boolean {
    return this.value === other.value;
  }
}

export { SuggestionId };