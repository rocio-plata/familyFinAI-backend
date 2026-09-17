// src/contexts/financial-tracking/domain/errors/duplicate-payment-method-name.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class DuplicatePaymentMethodNameError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.DUPLICATE_PAYMENT_METHOD_NAME";

  constructor(name: string) {
    super(`Ya existe un medio de pago activo con el nombre ${name}`);
  }
}

export { DuplicatePaymentMethodNameError };
