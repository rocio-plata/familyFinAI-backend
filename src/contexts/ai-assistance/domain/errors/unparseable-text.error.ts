// src/contexts/ai-assistance/domain/errors/unparseable-text.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class UnparseableTextError extends DomainError {
  readonly code = "AI_ASSISTANCE.UNPARSEABLE_TEXT";

  constructor() {
    super("El texto no contiene informacion financiera reconocible");
  }
}

export { UnparseableTextError };
