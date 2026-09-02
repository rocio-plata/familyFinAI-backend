// src/contexts/financial-tracking/domain/errors/duplicate-category-name.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class DuplicateCategoryNameError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.DUPLICATE_CATEGORY_NAME";

  constructor(name: string) {
    super(`Ya existe una categoría activa con el nombre ${name}`);
  }
}

export { DuplicateCategoryNameError };
