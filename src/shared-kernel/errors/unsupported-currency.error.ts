// shared-kernel/domain/currency.ts
import { DomainError } from "../errors/domain-error.js";


class UnsupportedCurrencyError  extends DomainError {
  readonly code = "AUTH.INVALID_CURRENCY";

  constructor(code: string) {
    super(`La moneda ${code} no está soportada`);
  }
}

export { UnsupportedCurrencyError };