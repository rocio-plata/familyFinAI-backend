// src/contexts/financial-tracking/domain/errors/category-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class CategoryNotFoundError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.CATEGORY_NOT_FOUND";

  constructor(categoryId: string) {
    super(`La categoría con id ${categoryId} no existe`);
  }
}

export { CategoryNotFoundError };
