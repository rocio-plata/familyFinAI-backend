// src/contexts/ai-assistance/domain/errors/suggestion-expired.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class SuggestionExpiredError extends DomainError {
  readonly code = "AI.SUGGESTION_EXPIRED";

  constructor() {
    super("La sugerencia expiró. Genera una nueva");
  }
}

export { SuggestionExpiredError };
