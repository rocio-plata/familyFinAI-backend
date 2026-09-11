// src/contexts/budgeting/domain/entities/budget-period-status.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { InvalidMoneyError } from "../../../financial-tracking/domain/errors/invalid-money.error.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { BudgetBalance } from "../value-objects/budget-balance.js";
import type { BudgetPeriod } from "../value-objects/budget-period.js";
import { BudgetPeriodStatusId } from "../value-objects/budget-period-status-id.js";

class BudgetPeriodStatus {
  private constructor(
    private readonly _id: BudgetPeriodStatusId,
    private readonly _familyId: FamilyId,
    private readonly _categoryId: CategoryId,
    private readonly _period: BudgetPeriod,
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

  get period(): BudgetPeriod {
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
    period: BudgetPeriod,
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
