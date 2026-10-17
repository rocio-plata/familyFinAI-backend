// src/shared-kernel/domain/money.ts
import { CurrencyMismatchError } from "../errors/currency-mismatch.error.js";
import { InvalidAmountError } from "../errors/invalid-amount.error.js";
import type { Currency } from "./currency.js";

class Money {
  private constructor(
    private readonly _minorUnits: number,
    private readonly _currency: Currency,
  ) {}

  static ofMinor(minorUnits: number, currency: Currency): Money {
    if (!Number.isSafeInteger(minorUnits)) {
      throw new InvalidAmountError();
    }
    return new Money(minorUnits, currency);
  }

  static of(amount: number, currency: Currency): Money {
    return Money.ofMinor(amount, currency);
  }

  get minorUnits(): number {
    return this._minorUnits;
  }

  get amount(): number {
    return this._minorUnits;
  }

  get currency(): Currency {
    return this._currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.ofMinor(this._minorUnits + other._minorUnits, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._minorUnits - other._minorUnits, this._currency);
  }

  isPositive(): boolean {
    return this._minorUnits > 0;
  }

  isZero(): boolean {
    return this._minorUnits === 0;
  }

  equals(other: Money): boolean {
    return this._currency.equals(other._currency) && this._minorUnits === other._minorUnits;
  }

  toDto(): { amount: number; currency: string } {
    return { amount: this._minorUnits, currency: this._currency.toString() };
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._minorUnits > other._minorUnits;
  }

  private assertSameCurrency(other: Money): void {
    if (!this._currency.equals(other._currency)) {
      throw new CurrencyMismatchError(this._currency.toString(), other._currency.toString());
    }
  }
}

export { Money };
