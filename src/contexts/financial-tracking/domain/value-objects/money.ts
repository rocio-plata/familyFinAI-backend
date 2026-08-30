// contexts/financial-tracking/domain/value-objects/money.ts
import type { Currency } from '../../../../shared-kernel/domain/currency.js';

class Money {
  private constructor(
    private readonly amount: number,   // en la unidad mínima (p. ej. centavos) para evitar errores de coma flotante
    private readonly currency: Currency,
  ) {}

  static of(amount: number, currency: Currency): Money {
    if (amount < 0) throw new InvalidMoneyError();
    return new Money(amount, currency);
  }

  add(other: Money): Money { /* valida misma currency */ }
  isGreaterThan(other: Money): boolean { }
}

export { Money };