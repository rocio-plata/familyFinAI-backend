// src/contexts/financial-tracking/domain/errors/no-default-payment-method-set.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class NoDefaultPaymentMethodSetError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.NO_DEFAULT_PAYMENT_METHOD_SET";

  constructor() {
    super("No hay un medio de pago predeterminado configurado");
  }
}

export { NoDefaultPaymentMethodSetError };
