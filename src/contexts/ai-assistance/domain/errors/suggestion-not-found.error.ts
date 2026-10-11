// src/contexts/ai-assistance/domain/errors/suggestion-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class SuggestionNotFoundError extends DomainError {
  readonly code = "AI_ASSISTANCE.SUGGESTION_NOT_FOUND";

  constructor(suggestionId: string) {
    super(`No existe la sugerencia '${suggestionId}'`);
  }
}

export { SuggestionNotFoundError };
