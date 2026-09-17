// src/contexts/reporting/domain/entities/payment-method-period-aggregate.ts
import type { Currency } from "../../../../shared-kernel/domain/currency.js";
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { InvalidMoneyError } from "../../../financial-tracking/domain/errors/invalid-money.error.js";
import type { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { PaymentMethodId } from "../../../financial-tracking/domain/value-objects/payment-method-id.js";
import { InvalidItemCountError } from "../errors/invalid-item-count.error.js";
import { ItemCount } from "../value-objects/item-count.js";

class PaymentMethodPeriodAggregate {
  private constructor(
    private readonly _familyId: FamilyId,
    private readonly _paymentMethodId: PaymentMethodId,
    private readonly _period: Period,
    private readonly _currency: Currency,
    private _totalExpense: Money,
    private _totalIncome: Money,
    private _itemCount: ItemCount,
  ) {}

  get familyId(): FamilyId {
    return this._familyId;
  }
  get paymentMethodId(): PaymentMethodId {
    return this._paymentMethodId;
  }
  get period(): Period {
    return this._period;
  }
  get totalExpense(): Money {
    return this._totalExpense;
  }
  get totalIncome(): Money {
    return this._totalIncome;
  }
  get itemCount(): ItemCount {
    return this._itemCount;
  }

  static create(
    familyId: FamilyId,
    paymentMethodId: PaymentMethodId,
    period: Period,
    currency: Currency,
  ): PaymentMethodPeriodAggregate {
    return new PaymentMethodPeriodAggregate(
      familyId,
      paymentMethodId,
      period,
      currency,
      Money.of(0, currency),
      Money.of(0, currency),
      ItemCount.zero(),
    );
  }

  static reconstitute(props: {
    familyId: FamilyId;
    paymentMethodId: PaymentMethodId;
    period: Period;
    currency: Currency;
    totalExpense: number;
    totalIncome: number;
    itemCount: number;
  }): PaymentMethodPeriodAggregate {
    return new PaymentMethodPeriodAggregate(
      props.familyId,
      props.paymentMethodId,
      props.period,
      props.currency,
      Money.of(props.totalExpense, props.currency),
      Money.of(props.totalIncome, props.currency),
      ItemCount.of(props.itemCount),
    );
  }

  registerItem(type: FinancialItemType, amount: Money): void {
    this.ensureCurrency(amount);
    this.updateTotal(type, amount.amount);
    this._itemCount = this._itemCount.increment();
  }

  changeItemAmount(type: FinancialItemType, previousAmount: Money, newAmount: Money): void {
    this.ensureCurrency(previousAmount);
    this.ensureCurrency(newAmount);
    this.updateTotal(type, newAmount.amount - previousAmount.amount);
  }

  removeItem(type: FinancialItemType, amount: Money): void {
    this.ensureCurrency(amount);
    if (this._itemCount.value === 0) throw new InvalidItemCountError();
    this.updateTotal(type, -amount.amount);
    this._itemCount = this._itemCount.decrement();
  }

  private updateTotal(type: FinancialItemType, delta: number): void {
    const current = type === "EXPENSE" ? this._totalExpense : this._totalIncome;
    const nextAmount = current.amount + delta;
    if (nextAmount < 0) throw new InvalidMoneyError();
    const next = Money.of(nextAmount, this._currency);
    if (type === "EXPENSE") this._totalExpense = next;
    else this._totalIncome = next;
  }

  private ensureCurrency(amount: Money): void {
    if (!this._currency.equals(amount.currency)) throw new InvalidMoneyError();
  }
}

export { PaymentMethodPeriodAggregate };
