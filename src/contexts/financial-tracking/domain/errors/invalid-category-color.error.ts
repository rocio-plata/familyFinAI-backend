// src/contexts/financial-tracking/domain/errors/invalid-category-color.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidCategoryColorError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_CATEGORY_COLOR";
}

export { InvalidCategoryColorError };
