// src/contexts/reporting/domain/entities/category-period-aggregate.ts

import type { Currency } from "../../../../shared-kernel/domain/currency.js";
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { InvalidMoneyError } from "../../../financial-tracking/domain/errors/invalid-money.error.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { InvalidItemCountError } from "../errors/invalid-item-count.error.js";
import { ItemCount } from "../value-objects/item-count.js";

class CategoryPeriodAggregate {
  private constructor(
    private readonly _familyId: FamilyId,
    private readonly _categoryId: CategoryId,
    private readonly _period: Period,
    private readonly _currency: Currency,
    private _totalExpense: Money,
    private _totalIncome: Money,
    private _itemCount: ItemCount,
  ) {}

  get familyId(): FamilyId {
    return this._familyId;
  }

  get categoryId(): CategoryId {
    return this._categoryId;
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
    categoryId: CategoryId,
    period: Period,
    currency: Currency,
  ): CategoryPeriodAggregate {
    return new CategoryPeriodAggregate(
      familyId,
      categoryId,
      period,
      currency,
      Money.of(0, currency),
      Money.of(0, currency),
      ItemCount.zero(),
    );
  }

  registerItem(type: FinancialItemType, amount: Money): void {
    this.ensureSameCurrency(amount);
    this.updateTotal(type, amount.amount);
    this._itemCount = this._itemCount.increment();
  }

  removeItem(type: FinancialItemType, amount: Money): void {
    this.ensureSameCurrency(amount);
    if (this._itemCount.value === 0) {
      throw new InvalidItemCountError();
    }
    this.updateTotal(type, -amount.amount);
    this._itemCount = this._itemCount.decrement();
  }

  private updateTotal(type: FinancialItemType, delta: number): void {
    const current = type === FinancialItemType.Expense ? this._totalExpense : this._totalIncome;
    const nextAmount = current.amount + delta;
    if (nextAmount < 0) {
      throw new InvalidMoneyError();
    }
    const next = Money.of(nextAmount, this._currency);
    if (type === FinancialItemType.Expense) {
      this._totalExpense = next;
    } else {
      this._totalIncome = next;
    }
  }

  private ensureSameCurrency(amount: Money): void {
    if (!this._currency.equals(amount.currency)) {
      throw new InvalidMoneyError();
    }
  }
}

export { CategoryPeriodAggregate };
