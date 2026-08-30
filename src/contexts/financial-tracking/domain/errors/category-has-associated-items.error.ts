// contexts/financial-tracking/domain/errors/category-has-associated-items.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class CategoryHasAssociatedItemsError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.CATEGORY_HAS_ASSOCIATED_ITEMS";

  constructor(categoryId: unknown) {
    super(`No se puede eliminar la categoría '${categoryId}' porque tiene items asociados`);
  }
}

export { CategoryHasAssociatedItemsError };
