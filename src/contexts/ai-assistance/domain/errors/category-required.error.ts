// src/contexts/ai-assistance/domain/errors/category-required.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class CategoryRequiredError extends DomainError {
  readonly code = "AI.CATEGORY_REQUIRED";

  constructor() {
    super("Debes elegir una categoría para confirmar la sugerencia");
  }
}

export { CategoryRequiredError };
