// src/contexts/budgeting/application/event-handlers/on-item-reclassified.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemReclassified } from "../../../financial-tracking/domain/events/item-reclassified.event.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { BudgetPeriodStatus } from "../../domain/entities/budget-period-status.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import type { BudgetPeriodStatusRepository } from "../../domain/repositories/budget-period-status.repository.js";

class OnItemReclassifiedEventHandler {
  constructor(
    private readonly budgetConfigurationRepository: BudgetConfigurationRepository,
    private readonly budgetPeriodStatusRepository: BudgetPeriodStatusRepository,
  ) {}

  async handle(event: ItemReclassified): Promise<void> {
    if (event.type !== FinancialItemType.Expense) return;

    const familyId = FamilyId.of(event.familyId);
    const period = Period.fromDate(event.occurredOn);
    const currency = Currency.of(event.currency);
    const amount = Money.of(event.amount, currency);
    const configurations = await this.budgetConfigurationRepository.findByFamilyId(familyId);
    const newConfiguration = configurations.find(
      (configuration) =>
        configuration.isActive && configuration.categoryId.equals(event.newCategoryId),
    );
    const previousStatus =
      await this.budgetPeriodStatusRepository.findByFamilyIdCategoryIdAndPeriod(
        familyId,
        event.previousCategoryId,
        period,
      );

    if (previousStatus) {
      previousStatus.removeSpending(amount);
      await this.budgetPeriodStatusRepository.save(previousStatus);
    }
    if (!newConfiguration) return;

    const existingNewStatus =
      await this.budgetPeriodStatusRepository.findByFamilyIdCategoryIdAndPeriod(
        familyId,
        event.newCategoryId,
        period,
      );
    const newStatus =
      existingNewStatus ??
      BudgetPeriodStatus.create(
        familyId,
        event.newCategoryId,
        period,
        newConfiguration.resolveAmountFor(period),
      );
    newStatus.registerSpending(amount);
    await this.budgetPeriodStatusRepository.save(newStatus);
  }
}

export { OnItemReclassifiedEventHandler };
