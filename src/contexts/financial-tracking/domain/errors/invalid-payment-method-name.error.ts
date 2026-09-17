// src/contexts/financial-tracking/domain/errors/invalid-payment-method-name.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class InvalidPaymentMethodNameError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.INVALID_PAYMENT_METHOD_NAME";
}

export { InvalidPaymentMethodNameError };
