// src/contexts/financial-tracking/domain/errors/duplicate-tag-name.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class DuplicateTagNameError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.DUPLICATE_TAG_NAME";

  constructor(name: string) {
    super(`Ya existe un tag con el nombre ${name} en esta categoría`);
  }
}

export { DuplicateTagNameError };
