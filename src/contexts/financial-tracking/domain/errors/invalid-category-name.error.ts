// contexts/financial-tracking/domain/errors/invalid-category-name.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidCategoryNameError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_CATEGORY_NAME";
}

export { InvalidCategoryNameError };
