// src/contexts/financial-tracking/domain/errors/invalid-category-icon.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidCategoryIconError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_CATEGORY_ICON";
}

export { InvalidCategoryIconError };
