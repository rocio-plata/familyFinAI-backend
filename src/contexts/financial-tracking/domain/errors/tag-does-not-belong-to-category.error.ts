// src/contexts/financial-tracking/domain/errors/tag-does-not-belong-to-category.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class TagDoesNotBelongToCategoryError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.TAG_DOES_NOT_BELONG_TO_CATEGORY";

  constructor(tagId: string, categoryId: string) {
    super(`El tag con id ${tagId} no pertenece a la categoría ${categoryId}`);
  }
}

export { TagDoesNotBelongToCategoryError };
