// /src/shared-kernel/domain/currency.ts
import { UnsupportedCurrencyError } from "../errors/unsupported-currency.error.js";

const SUPPORTED_CURRENCIES = ["CLP", "USD", "EUR"] as const;
type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];
const CURRENCY_EXPONENTS: Record<CurrencyCode, number> = { CLP: 0, USD: 2, EUR: 2 };

const DEFAULT_CURRENCY: CurrencyCode = "CLP";

class Currency {
  private constructor(private readonly code: CurrencyCode) {}

  static default(): Currency {
    return new Currency(DEFAULT_CURRENCY);
  }

  static of(code: string): Currency {
    if (!SUPPORTED_CURRENCIES.includes(code as CurrencyCode)) {
      throw new UnsupportedCurrencyError(code);
    }
    return new Currency(code as CurrencyCode);
  }

  toString(): string {
    return this.code;
  }

  get exponent(): number {
    return CURRENCY_EXPONENTS[this.code];
  }

  equals(other: Currency): boolean {
    return this.code === other.code;
  }
}

export { Currency };
