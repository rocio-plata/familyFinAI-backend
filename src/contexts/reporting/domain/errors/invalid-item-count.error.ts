// src/contexts/reporting/domain/errors/invalid-item-count.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidItemCountError extends DomainError {
  readonly code = "REPORTING.INVALID_ITEM_COUNT";

  constructor() {
    super("La cantidad de movimientos no puede ser negativa");
  }
}

export { InvalidItemCountError };
