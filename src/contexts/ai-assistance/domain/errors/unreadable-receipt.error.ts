// src/contexts/ai-assistance/domain/errors/unreadable-receipt.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class UnreadableReceiptError extends DomainError {
  readonly code = "AI_ASSISTANCE.UNREADABLE_RECEIPT";

  constructor() {
    super("No se pudo extraer informacion suficiente del recibo");
  }
}

export { UnreadableReceiptError };
