// src/contexts/budgeting/domain/events/budget-created.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { Money } from "../../../../shared-kernel/domain/money.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import type { BudgetConfigurationId } from "../value-objects/budget-configuration-id.js";

class BudgetCreated extends DomainEvent {
  readonly eventName = "budgeting.budget-created";

  constructor(
    readonly budgetConfigurationId: BudgetConfigurationId,
    readonly familyId: string,
    readonly categoryId: CategoryId,
    readonly defaultAmount: Money,
  ) {
    super();
  }
}

export { BudgetCreated };
