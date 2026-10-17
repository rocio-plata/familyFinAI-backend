// src/shared-kernel/errors/currency-mismatch.error.ts
import { DomainError } from "./domain-error.js";

class CurrencyMismatchError extends DomainError {
  readonly code = "SHARED.CURRENCY_MISMATCH";

  constructor(
    readonly expected: string,
    readonly received: string,
  ) {
    super(`La moneda ${received} no coincide con la moneda esperada (${expected})`);
  }
}

export { CurrencyMismatchError };
