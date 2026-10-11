// src/contexts/ai-assistance/domain/repositories/suggestion.repository.ts
import type { ExpenseSuggestion } from "../entities/expense-suggestion.js";
import type { ReceiptSuggestion } from "../entities/receipt-suggestion.js";
import type { SuggestionId } from "../value-objects/suggestion-id.js";

type Suggestion = ExpenseSuggestion | ReceiptSuggestion;

interface SuggestionRepository {
  save(suggestion: Suggestion): Promise<void>;
  findById(suggestionId: SuggestionId): Promise<Suggestion | null>;
}

export type { Suggestion, SuggestionRepository };
