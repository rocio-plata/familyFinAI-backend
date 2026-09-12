// src/contexts/budgeting/application/event-handlers/on-item-deleted.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemDeleted } from "../../../financial-tracking/domain/events/item-deleted.event.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";
import type { BudgetPeriodStatusRepository } from "../../domain/repositories/budget-period-status.repository.js";

class OnItemDeletedEventHandler {
  constructor(
    private readonly budgetConfigurationRepository: BudgetConfigurationRepository,
    private readonly budgetPeriodStatusRepository: BudgetPeriodStatusRepository,
  ) {}

  async handle(event: ItemDeleted): Promise<void> {
    if (event.type !== FinancialItemType.Expense) return;

    const familyId = FamilyId.of(event.familyId);
    const configurations = await this.budgetConfigurationRepository.findByFamilyId(familyId);
    const configuration = configurations.find((candidate) =>
      candidate.categoryId.equals(event.categoryId),
    );
    if (!configuration) return;

    const period = Period.fromDate(event.occurredOn);
    const status = await this.budgetPeriodStatusRepository.findByFamilyIdCategoryIdAndPeriod(
      familyId,
      event.categoryId,
      period,
    );
    if (!status) return;

    status.removeSpending(Money.of(event.amount, Currency.of(event.currency)));
    await this.budgetPeriodStatusRepository.save(status);
  }
}

export { OnItemDeletedEventHandler };
