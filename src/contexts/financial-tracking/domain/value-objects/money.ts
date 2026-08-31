// contexts/financial-tracking/domain/value-objects/money.ts
import type { Currency } from "../../../../shared-kernel/domain/currency.js";
import { InvalidMoneyError } from "../errors/invalid-money.error.js";

class Money {
  private constructor(
    private readonly amount: number, // en la unidad mínima (p. ej. centavos) para evitar errores de coma flotante
    private readonly currency: Currency,
  ) {}

  static of(amount: number, currency: Currency): Money {
    if (amount < 0) throw new InvalidMoneyError();
    return new Money(amount, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new InvalidMoneyError();
    return new Money(this.amount + other.amount, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    if (this.currency !== other.currency) throw new InvalidMoneyError();
    return this.amount > other.amount;
  }
}

export { Money };
