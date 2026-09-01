// contexts/financial-tracking/domain/errors/unsupported-currency.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class UnsupportedCurrencyError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.UNSUPPORTED_CURRENCY";

  constructor(currencyCode: string) {
    super(`La moneda '${currencyCode}' no está soportada`);
  }
}

export { UnsupportedCurrencyError };
