// contexts/financial-tracking/domain/value-objects/money.ts
import type { Currency } from "../../../../shared-kernel/domain/currency.js";
import { InvalidMoneyError } from "../errors/invalid-money.error.js";

class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: Currency,
  ) {}

  static of(amount: number, currency: Currency): Money {
    if (amount < 0) throw new InvalidMoneyError();
    return new Money(amount, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): Currency {
    return this._currency;
  }

  add(other: Money): Money {
    if (this._currency !== other._currency) throw new InvalidMoneyError();
    return new Money(this._amount + other._amount, this._currency);
  }

  isGreaterThan(other: Money): boolean {
    if (this._currency !== other._currency) throw new InvalidMoneyError();
    return this._amount > other._amount;
  }
}

export { Money };
