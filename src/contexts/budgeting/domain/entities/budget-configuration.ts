// src/contexts/budgeting/domain/entities/budget-configuration.ts

import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { InvalidMoneyError } from "../../../financial-tracking/domain/errors/invalid-money.error.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import type { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { NoOverrideForPeriodError } from "../errors/no-override-for-period.error.js";
import { BudgetConfigurationId } from "../value-objects/budget-configuration-id.js";

class BudgetConfiguration {
  private constructor(
    private readonly _id: BudgetConfigurationId,
    private readonly _familyId: FamilyId,
    private readonly _categoryId: CategoryId,
    private _defaultAmount: Money,
    private readonly _overrides: Map<string, Money>,
    private _isActive: boolean,
  ) {}

  get id(): BudgetConfigurationId {
    return this._id;
  }

  get familyId(): FamilyId {
    return this._familyId;
  }

  get categoryId(): CategoryId {
    return this._categoryId;
  }

  get defaultAmount(): Money {
    return this._defaultAmount;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  static create(
    familyId: FamilyId,
    categoryId: CategoryId,
    defaultAmount: Money,
  ): BudgetConfiguration {
    return new BudgetConfiguration(
      BudgetConfigurationId.generate(),
      familyId,
      categoryId,
      defaultAmount,
      new Map(),
      true,
    );
  }

  resolveAmountFor(period: Period): Money {
    return this._overrides.get(period.toString()) ?? this._defaultAmount;
  }

  updateDefaultAmount(newAmount: Money): void {
    this.ensureSameCurrency(newAmount);
    this._defaultAmount = newAmount;
  }

  setOverrideForPeriod(period: Period, amount: Money): void {
    this.ensureSameCurrency(amount);
    this._overrides.set(period.toString(), amount);
  }

  removeOverrideForPeriod(period: Period): void {
    if (!this._overrides.delete(period.toString())) {
      throw new NoOverrideForPeriodError(period.toString());
    }
  }

  deactivate(): void {
    this._isActive = false;
  }

  private ensureSameCurrency(amount: Money): void {
    if (!this._defaultAmount.currency.equals(amount.currency)) {
      throw new InvalidMoneyError();
    }
  }
}

export { BudgetConfiguration };
