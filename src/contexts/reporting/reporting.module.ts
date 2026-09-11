// src/contexts/reporting/reporting.module.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { requireFamilyMembership } from "../../platform/auth/require-family-membership.middleware.js";
import type { EventBus } from "../../platform/events/event-bus.js";
import type { GetFamilyMembershipQuery } from "../family-access/application/queries/get-family-membership.query.js";
import type { GetCategoriesQuery } from "../financial-tracking/application/queries/get-categories.query.js";
import type { GetFinancialItemsQuery } from "../financial-tracking/application/queries/get-financial-items.query.js";
import type { ItemAmountChanged } from "../financial-tracking/domain/events/item-amount-changed.event.js";
import type { ItemDeleted } from "../financial-tracking/domain/events/item-deleted.event.js";
import type { ItemReclassified } from "../financial-tracking/domain/events/item-reclassified.event.js";
import type { ItemRecorded } from "../financial-tracking/domain/events/item-recorded.event.js";
import { OnItemAmountChangedEventHandler } from "./application/event-handlers/on-item-amount-changed.event-handler.js";
import { OnItemDeletedEventHandler } from "./application/event-handlers/on-item-deleted.event-handler.js";
import { OnItemReclassifiedEventHandler } from "./application/event-handlers/on-item-reclassified.event-handler.js";
import { OnItemRecordedEventHandler } from "./application/event-handlers/on-item-recorded.event-handler.js";
import { GetCategoryBreakdownQuery } from "./application/queries/get-category-breakdown.query.js";
import { GetDashboardSummaryQuery } from "./application/queries/get-dashboard-summary.query.js";
import { GetDrillDownQuery } from "./application/queries/get-drill-down.query.js";
import { GetPeriodComparisonQuery } from "./application/queries/get-period-comparison.query.js";
import { GetTrendQuery } from "./application/queries/get-trend.query.js";
import type { CategoryPeriodAggregateRepository } from "./domain/repositories/category-period-aggregate.repository.js";
import { registerReportingRoutes } from "./infrastructure/http/reporting.routes.js";

interface ReportingModuleDependencies {
  aggregateRepository: CategoryPeriodAggregateRepository;
  getCategoriesQuery: GetCategoriesQuery;
  getFinancialItemsQuery: GetFinancialItemsQuery;
  eventBus: EventBus;
}

interface ReportingModule {
  registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void;
}

function buildReportingModule(
  deps: ReportingModuleDependencies,
  getFamilyMembershipQuery: GetFamilyMembershipQuery,
): ReportingModule {
  const getCategoryBreakdownQuery = new GetCategoryBreakdownQuery(
    deps.aggregateRepository,
    deps.getCategoriesQuery,
  );
  const getFinancialItemsQuery = deps.getFinancialItemsQuery;
  const queries = {
    getDashboardSummary: new GetDashboardSummaryQuery(deps.aggregateRepository),
    getCategoryBreakdown: getCategoryBreakdownQuery,
    getPeriodComparison: new GetPeriodComparisonQuery(deps.aggregateRepository),
    getTrend: new GetTrendQuery(deps.aggregateRepository),
    getDrillDown: new GetDrillDownQuery(
      getCategoryBreakdownQuery,
      getFinancialItemsQuery,
      deps.getCategoriesQuery,
    ),
  };

  const recordedHandler = new OnItemRecordedEventHandler(deps.aggregateRepository);
  const amountChangedHandler = new OnItemAmountChangedEventHandler(deps.aggregateRepository);
  const reclassifiedHandler = new OnItemReclassifiedEventHandler(deps.aggregateRepository);
  const deletedHandler = new OnItemDeletedEventHandler(deps.aggregateRepository);
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
      registerReportingRoutes(app, {
        authenticate,
        requireFamilyMembership: (minRole) =>
          requireFamilyMembership(getFamilyMembershipQuery, minRole),
        getDashboardSummaryQuery: queries.getDashboardSummary,
        getCategoryBreakdownQuery: queries.getCategoryBreakdown,
        getPeriodComparisonQuery: queries.getPeriodComparison,
        getTrendQuery: queries.getTrend,
        getDrillDownQuery: queries.getDrillDown,
      });
    },
  };
}

export type { ReportingModule, ReportingModuleDependencies };
export { buildReportingModule };
