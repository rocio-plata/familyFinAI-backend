// contexts/financial-tracking/domain/errors/tag-has-associated-items.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class TagHasAssociatedItemsError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.TAG_HAS_ASSOCIATED_ITEMS";

  constructor(tagId: unknown) {
    super(`No se puede eliminar el tag '${tagId}' porque tiene items asociados`);
  }
}

export { TagHasAssociatedItemsError };
