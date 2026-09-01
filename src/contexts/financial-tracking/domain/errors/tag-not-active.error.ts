// src/contexts/financial-tracking/domain/errors/tag-not-active.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class TagNotActiveError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.TAG_NOT_ACTIVE";

  constructor(tagId: string) {
    super(`El tag con id ${tagId} está deprecado y no puede usarse`);
  }
}

export { TagNotActiveError };
