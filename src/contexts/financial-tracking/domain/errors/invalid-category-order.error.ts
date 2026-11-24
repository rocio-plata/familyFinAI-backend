// src/contexts/financial-tracking/domain/errors/invalid-category-order.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidCategoryOrderError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_CATEGORY_ORDER";

  constructor() {
    super(
      "La lista de categorías a ordenar debe tener al menos un id, sin repetidos y todos del mismo tipo",
    );
  }
}

export { InvalidCategoryOrderError };
