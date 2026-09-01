// src/contexts/financial-tracking/domain/errors/category-not-active.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class CategoryNotActiveError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.CATEGORY_NOT_ACTIVE";

  constructor(categoryId: string) {
    super(`La categoría con id ${categoryId} está deprecada y no puede usarse`);
  }
}

export { CategoryNotActiveError };
