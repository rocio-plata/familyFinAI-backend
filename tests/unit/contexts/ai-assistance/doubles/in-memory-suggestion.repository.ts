// tests/unit/contexts/ai-assistance/doubles/in-memory-suggestion.repository.ts
import type {
  Suggestion,
  SuggestionRepository,
} from "../../../../../src/contexts/ai-assistance/domain/repositories/suggestion.repository.js";
import type { SuggestionId } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-id.js";

class InMemorySuggestionRepository implements SuggestionRepository {
  private readonly suggestions = new Map<string, Suggestion>();

  async save(suggestion: Suggestion): Promise<void> {
    this.suggestions.set(suggestion.id.toString(), suggestion);
  }

  async findById(suggestionId: SuggestionId): Promise<Suggestion | null> {
    return this.suggestions.get(suggestionId.toString()) ?? null;
  }
}

export { InMemorySuggestionRepository };
