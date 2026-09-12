// src/contexts/budgeting/application/event-handlers/on-item-amount-changed.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemAmountChanged } from "../../../financial-tracking/domain/events/item-amount-changed.event.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { BudgetPeriodStatus } from "../../domain/entities/budget-period-status.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import type { BudgetPeriodStatusRepository } from "../../domain/repositories/budget-period-status.repository.js";

class OnItemAmountChangedEventHandler {
  constructor(
    private readonly budgetConfigurationRepository: BudgetConfigurationRepository,
    private readonly budgetPeriodStatusRepository: BudgetPeriodStatusRepository,
  ) {}

  async handle(event: ItemAmountChanged): Promise<void> {
    if (event.type !== FinancialItemType.Expense) return;

    const familyId = FamilyId.of(event.familyId);
    const configurations = await this.budgetConfigurationRepository.findByFamilyId(familyId);
    const configuration = configurations.find(
      (candidate) => candidate.isActive && candidate.categoryId.equals(event.categoryId),
    );
    if (!configuration) return;

    const delta = event.newAmount - event.previousAmount;
    if (delta === 0) return;

    const period = Period.fromDate(event.occurredOn);
    const status = await this.budgetPeriodStatusRepository.findByFamilyIdCategoryIdAndPeriod(
      familyId,
      event.categoryId,
      period,
    );
    if (!status && delta < 0) return;

    const currency = Currency.of(event.currency);
    const amount = Money.of(Math.abs(delta), currency);
    const resolvedStatus =
      status ??
      BudgetPeriodStatus.create(
        familyId,
        event.categoryId,
        period,
        configuration.resolveAmountFor(period),
      );

    if (delta > 0) resolvedStatus.registerSpending(amount);
    else resolvedStatus.removeSpending(amount);
    await this.budgetPeriodStatusRepository.save(resolvedStatus);
  }
}

export { OnItemAmountChangedEventHandler };
