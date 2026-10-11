// src/contexts/ai-assistance/domain/errors/invalid-merchant-name.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidMerchantNameError extends DomainError {
  readonly code = "AI_ASSISTANCE.INVALID_MERCHANT_NAME";

  constructor() {
    super("El nombre del comercio no puede estar vacio y debe tener como maximo 100 caracteres");
  }
}

export { InvalidMerchantNameError };
