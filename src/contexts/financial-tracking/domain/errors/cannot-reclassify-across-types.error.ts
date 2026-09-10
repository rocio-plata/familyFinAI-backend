// /src/contexts/financial-tracking/domain/errors/cannot-reclassify-across-types.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class CannotReclassifyAcrossTypesError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.CANNOT_RECLASSIFY_ACROSS_TYPES";

  constructor(currentType: string, targetType: string) {
    super(
      `No se puede reclasificar un item de tipo '${currentType}' hacia una categoría de tipo '${targetType}'`,
    );
  }
}

export { CannotReclassifyAcrossTypesError };
