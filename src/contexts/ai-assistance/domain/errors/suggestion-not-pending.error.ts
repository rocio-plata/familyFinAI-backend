// src/contexts/ai-assistance/domain/errors/suggestion-not-pending.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class SuggestionNotPendingError extends DomainError {
  readonly code = "AI_ASSISTANCE.SUGGESTION_NOT_PENDING";

  constructor() {
    super("La sugerencia ya no esta pendiente");
  }
}

export { SuggestionNotPendingError };
