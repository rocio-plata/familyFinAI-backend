// src/contexts/ai-assistance/domain/errors/invalid-receipt-image-ref.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidReceiptImageRefError extends DomainError {
  readonly code = "AI_ASSISTANCE.INVALID_RECEIPT_IMAGE_REF";

  constructor() {
    super("La referencia de imagen del recibo no puede estar vacia");
  }
}

export { InvalidReceiptImageRefError };
