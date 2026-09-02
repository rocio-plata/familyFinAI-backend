// src/contexts/financial-tracking/domain/errors/invalid-tag-order.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidTagOrderError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_TAG_ORDER";

  constructor() {
    super("El array de tags recibido no coincide con los tags actuales de la categoría");
  }
}

export { InvalidTagOrderError };
