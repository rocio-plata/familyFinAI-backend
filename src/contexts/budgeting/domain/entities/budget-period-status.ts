// src/contexts/budgeting/domain/entities/budget-period-status.ts

import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { InvalidMoneyError } from "../../../financial-tracking/domain/errors/invalid-money.error.js";
import { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { BudgetBalance } from "../value-objects/budget-balance.js";
import { BudgetPeriodStatusId } from "../value-objects/budget-period-status-id.js";

class BudgetPeriodStatus {
  private constructor(
    private readonly _id: BudgetPeriodStatusId,
    private readonly _familyId: FamilyId,
    private readonly _categoryId: CategoryId,
    private readonly _period: Period,
    private _limitAmount: Money,
    private _spent: Money,
  ) {}

  get id(): BudgetPeriodStatusId {
    return this._id;
  }

  get familyId(): FamilyId {
    return this._familyId;
  }

  get categoryId(): CategoryId {
    return this._categoryId;
  }

  get period(): Period {
    return this._period;
  }

  get limitAmount(): Money {
    return this._limitAmount;
  }

  get spent(): Money {
    return this._spent;
  }

  get remaining(): BudgetBalance {
    return BudgetBalance.of(
      this._limitAmount.amount - this._spent.amount,
      this._limitAmount.currency,
    );
  }

  get isOverspent(): boolean {
    return this._spent.amount > this._limitAmount.amount;
  }

  static create(
    familyId: FamilyId,
    categoryId: CategoryId,
    period: Period,
    limitAmount: Money,
  ): BudgetPeriodStatus {
    return new BudgetPeriodStatus(
      BudgetPeriodStatusId.generate(),
      familyId,
      categoryId,
      period,
      limitAmount,
      Money.of(0, limitAmount.currency),
    );
  }

  static reconstitute(props: {
    id: string;
    familyId: string;
    categoryId: string;
    period: string;
    limitAmount: number;
    spent: number;
    currency: string;
  }): BudgetPeriodStatus {
    const currency = Currency.of(props.currency);
    return new BudgetPeriodStatus(
      BudgetPeriodStatusId.of(props.id),
      FamilyId.of(props.familyId),
      CategoryId.of(props.categoryId),
      Period.of(Number(props.period.slice(0, 4)), Number(props.period.slice(5, 7))),
      Money.of(props.limitAmount, currency),
      Money.of(props.spent, currency),
    );
  }

  registerSpending(amount: Money): void {
    this.ensureSameCurrency(amount);
    this._spent = this._spent.add(amount);
  }

  removeSpending(amount: Money): void {
    this.ensureSameCurrency(amount);
    if (amount.amount > this._spent.amount) {
      throw new InvalidMoneyError();
    }
    this._spent = Money.of(this._spent.amount - amount.amount, this._spent.currency);
  }

  updateLimitAmount(limitAmount: Money): void {
    this.ensureSameCurrency(limitAmount);
    this._limitAmount = limitAmount;
  }

  private ensureSameCurrency(amount: Money): void {
    if (!this._limitAmount.currency.equals(amount.currency)) {
      throw new InvalidMoneyError();
    }
  }
}

export { BudgetPeriodStatus };
