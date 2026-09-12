// src/contexts/budgeting/budgeting.module.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { requireFamilyMembership } from "../../platform/auth/require-family-membership.middleware.js";
import type { EventBus } from "../../platform/events/event-bus.js";
import type { GetFamilyDefaultCurrencyQuery } from "../family-access/application/queries/get-family-default-currency.query.js";
import type { GetFamilyMembershipQuery } from "../family-access/application/queries/get-family-membership.query.js";
import type { FamilyRepository } from "../family-access/domain/repositories/family.repository.js";
import type { GetCategoriesQuery } from "../financial-tracking/application/queries/get-categories.query.js";
import type { ItemAmountChanged } from "../financial-tracking/domain/events/item-amount-changed.event.js";
import type { ItemDeleted } from "../financial-tracking/domain/events/item-deleted.event.js";
import type { ItemReclassified } from "../financial-tracking/domain/events/item-reclassified.event.js";
import type { ItemRecorded } from "../financial-tracking/domain/events/item-recorded.event.js";
import { CreateBudgetConfigurationUseCase } from "./application/commands/create-budget-configuration.usecase.js";
import { DeactivateBudgetConfigurationUseCase } from "./application/commands/deactivate-budget-configuration.usecase.js";
import { RemoveBudgetOverrideForPeriodUseCase } from "./application/commands/remove-budget-override-for-period.usecase.js";
import { SetBudgetOverrideForPeriodUseCase } from "./application/commands/set-budget-override-for-period.usecase.js";
import { UpdateDefaultBudgetAmountUseCase } from "./application/commands/update-default-budget-amount.usecase.js";
import { OnItemAmountChangedEventHandler } from "./application/event-handlers/on-item-amount-changed.event-handler.js";
import { OnItemDeletedEventHandler } from "./application/event-handlers/on-item-deleted.event-handler.js";
import { OnItemReclassifiedEventHandler } from "./application/event-handlers/on-item-reclassified.event-handler.js";
import { OnItemRecordedEventHandler } from "./application/event-handlers/on-item-recorded.event-handler.js";
import { GetBudgetsQuery } from "./application/queries/get-budgets.query.js";
import type { BudgetConfigurationRepository } from "./domain/repositories/budget-configuration.repository.js";
import type { BudgetPeriodStatusRepository } from "./domain/repositories/budget-period-status.repository.js";
import { registerBudgetingRoutes } from "./infrastructure/http/budgeting.routes.js";

interface BudgetingModuleDependencies {
  familyRepository: FamilyRepository;
  budgetConfigurationRepository: BudgetConfigurationRepository;
  budgetPeriodStatusRepository: BudgetPeriodStatusRepository;
  getCategoriesQuery: GetCategoriesQuery;
  eventBus: EventBus;
}

interface BudgetingModule {
  registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void;
}

function buildBudgetingModule(
  deps: BudgetingModuleDependencies,
  getFamilyMembershipQuery: GetFamilyMembershipQuery,
  getFamilyDefaultCurrencyQuery: GetFamilyDefaultCurrencyQuery,
): BudgetingModule {
  const createBudgetConfigurationUseCase = new CreateBudgetConfigurationUseCase(
    deps.familyRepository,
    deps.getCategoriesQuery,
    deps.budgetConfigurationRepository,
    deps.eventBus,
  );
  const updateDefaultBudgetAmountUseCase = new UpdateDefaultBudgetAmountUseCase(
    deps.budgetConfigurationRepository,
  );
  const setBudgetOverrideForPeriodUseCase = new SetBudgetOverrideForPeriodUseCase(
    deps.budgetConfigurationRepository,
    deps.budgetPeriodStatusRepository,
  );
  const removeBudgetOverrideForPeriodUseCase = new RemoveBudgetOverrideForPeriodUseCase(
    deps.budgetConfigurationRepository,
  );
  const deactivateBudgetConfigurationUseCase = new DeactivateBudgetConfigurationUseCase(
    deps.budgetConfigurationRepository,
  );
  const getBudgetsQuery = new GetBudgetsQuery(
    deps.budgetConfigurationRepository,
    deps.budgetPeriodStatusRepository,
    deps.getCategoriesQuery,
  );

  const recordedHandler = new OnItemRecordedEventHandler(
    deps.budgetConfigurationRepository,
    deps.budgetPeriodStatusRepository,
  );
  const amountChangedHandler = new OnItemAmountChangedEventHandler(
    deps.budgetConfigurationRepository,
    deps.budgetPeriodStatusRepository,
  );
  const reclassifiedHandler = new OnItemReclassifiedEventHandler(
    deps.budgetConfigurationRepository,
    deps.budgetPeriodStatusRepository,
  );
  const deletedHandler = new OnItemDeletedEventHandler(
    deps.budgetConfigurationRepository,
    deps.budgetPeriodStatusRepository,
  );
  deps.eventBus.subscribe<ItemRecorded>("financial-tracking.item-recorded", (event) =>
    recordedHandler.handle(event),
  );
  deps.eventBus.subscribe<ItemAmountChanged>("financial-tracking.item-amount-changed", (event) =>
    amountChangedHandler.handle(event),
  );
  deps.eventBus.subscribe<ItemReclassified>("financial-tracking.item-reclassified", (event) =>
    reclassifiedHandler.handle(event),
  );
  deps.eventBus.subscribe<ItemDeleted>("financial-tracking.item-deleted", (event) =>
    deletedHandler.handle(event),
  );

  return {
    registerRoutes(app, authenticate): void {
      registerBudgetingRoutes(app, {
        authenticate,
        requireFamilyMembership: (minRole) =>
          requireFamilyMembership(getFamilyMembershipQuery, minRole),
        getFamilyDefaultCurrencyQuery,
        createBudgetConfigurationUseCase,
        updateDefaultBudgetAmountUseCase,
        setBudgetOverrideForPeriodUseCase,
        removeBudgetOverrideForPeriodUseCase,
        deactivateBudgetConfigurationUseCase,
        getBudgetsQuery,
      });
    },
  };
}

export type { BudgetingModule, BudgetingModuleDependencies };
export { buildBudgetingModule };
