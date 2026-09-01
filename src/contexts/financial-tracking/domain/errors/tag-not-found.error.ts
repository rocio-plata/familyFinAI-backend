// src/contexts/financial-tracking/domain/errors/tag-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class TagNotFoundError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.TAG_NOT_FOUND";

  constructor(tagId: string) {
    super(`El tag con id ${tagId} no existe`);
  }
}

export { TagNotFoundError };
