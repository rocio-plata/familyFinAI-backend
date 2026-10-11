// src/contexts/ai-assistance/domain/errors/invalid-suggestion-id.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidSuggestionIdError extends DomainError {
  readonly code = "AI_ASSISTANCE.INVALID_SUGGESTION_ID";

  constructor(value: string) {
    super(`'${value}' no es un SuggestionId valido`);
  }
}

export { InvalidSuggestionIdError };
