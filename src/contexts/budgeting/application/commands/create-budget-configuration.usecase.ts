// src/contexts/budgeting/application/commands/create-budget-configuration.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import { FamilyNotFoundError } from "../../../family-access/domain/errors/family-not-found.error.js";
import type { FamilyRepository } from "../../../family-access/domain/repositories/family.repository.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { GetCategoriesQuery } from "../../../financial-tracking/application/queries/get-categories.query.js";
import { CategoryNotActiveError } from "../../../financial-tracking/domain/errors/category-not-active.error.js";
import { CategoryNotFoundError } from "../../../financial-tracking/domain/errors/category-not-found.error.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { CategoryStatus } from "../../../financial-tracking/domain/value-objects/category-status.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import type { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { BudgetConfiguration } from "../../domain/entities/budget-configuration.js";
import { CategoryNotExpenseError } from "../../domain/errors/category-not-expense.error.js";
import { DuplicateBudgetConfigurationError } from "../../domain/errors/duplicate-budget-configuration.error.js";
import { BudgetCreated } from "../../domain/events/budget-created.event.js";
import type { BudgetConfigurationRepository } from "../../domain/repositories/budget-configuration.repository.js";

interface CreateBudgetConfigurationInput {
  familyId: FamilyId;
  categoryId: CategoryId;
  defaultAmount: Money;
}

class CreateBudgetConfigurationUseCase {
  constructor(
    private readonly familyRepository: FamilyRepository,
    private readonly getCategoriesQuery: GetCategoriesQuery,
    private readonly budgetConfigurationRepository: BudgetConfigurationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateBudgetConfigurationInput): Promise<BudgetConfiguration> {
    const family = await this.familyRepository.findById(input.familyId);
    if (!family) {
      throw new FamilyNotFoundError(input.familyId);
    }

    const categories = await this.getCategoriesQuery.execute({
      familyId: input.familyId,
      includeDeprecated: true,
    });
    const category = categories.find((candidate) => candidate.id.equals(input.categoryId));
    if (!category) {
      throw new CategoryNotFoundError(input.categoryId.toString());
    }
    if (category.status !== CategoryStatus.Active) {
      throw new CategoryNotActiveError(input.categoryId.toString());
    }
    if (category.type !== FinancialItemType.Expense) {
      throw new CategoryNotExpenseError(input.categoryId.toString());
    }

    const existing = await this.budgetConfigurationRepository.findByFamilyId(input.familyId);
    if (
      existing.some(
        (configuration) =>
          configuration.isActive && configuration.categoryId.equals(input.categoryId),
      )
    ) {
      throw new DuplicateBudgetConfigurationError(input.categoryId.toString());
    }

    const configuration = BudgetConfiguration.create(
      input.familyId,
      input.categoryId,
      input.defaultAmount,
    );
    await this.budgetConfigurationRepository.save(configuration);
    await this.eventBus.publish(
      new BudgetCreated(
        configuration.id,
        configuration.familyId.toString(),
        configuration.categoryId,
        configuration.defaultAmount,
      ),
    );
    return configuration;
  }
}

export type { CreateBudgetConfigurationInput };
export { CreateBudgetConfigurationUseCase };
