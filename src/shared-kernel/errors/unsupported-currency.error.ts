// /src/shared-kernel/errors/unsupported-currency.error.ts
import { DomainError } from "../errors/domain-error.js";

class UnsupportedCurrencyError extends DomainError {
  readonly code = "SHARED.UNSUPPORTED_CURRENCY";

  constructor(code: string) {
    super(`La moneda ${code} no está soportada`);
  }
}

export { UnsupportedCurrencyError };
