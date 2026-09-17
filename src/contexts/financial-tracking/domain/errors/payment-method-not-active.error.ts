// src/contexts/financial-tracking/domain/errors/payment-method-not-active.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class PaymentMethodNotActiveError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_ACTIVE";

  constructor(paymentMethodId: string) {
    super(`El medio de pago con id ${paymentMethodId} está deprecado y no puede usarse`);
  }
}

export { PaymentMethodNotActiveError };
