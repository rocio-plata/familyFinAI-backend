// src/contexts/financial-tracking/domain/errors/payment-method-not-found.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class PaymentMethodNotFoundError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_FOUND";

  constructor(paymentMethodId: string) {
    super(`El medio de pago con id ${paymentMethodId} no existe`);
  }
}

export { PaymentMethodNotFoundError };
