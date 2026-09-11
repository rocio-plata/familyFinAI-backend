// src/contexts/reporting/domain/errors/tag-without-category.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class TagWithoutCategoryError extends DomainError {
  readonly code = "REPORTING.TAG_WITHOUT_CATEGORY";

  constructor() {
    super("No se puede consultar un tag sin especificar su categoría");
  }
}

export { TagWithoutCategoryError };
