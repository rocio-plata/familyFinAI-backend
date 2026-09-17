// tests/contexts/reporting/infrastructure/http/reporting.routes.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import Fastify, { type preHandlerHookHandler } from "fastify";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { GetCategoriesQuery } from "../../../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { GetFinancialItemsQuery } from "../../../../../src/contexts/financial-tracking/application/queries/get-financial-items.query.js";
import { Category } from "../../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { GetCategoryBreakdownQuery } from "../../../../../src/contexts/reporting/application/queries/get-category-breakdown.query.js";
import { GetDashboardSummaryQuery } from "../../../../../src/contexts/reporting/application/queries/get-dashboard-summary.query.js";
import { GetDrillDownQuery } from "../../../../../src/contexts/reporting/application/queries/get-drill-down.query.js";
import { GetPeriodComparisonQuery } from "../../../../../src/contexts/reporting/application/queries/get-period-comparison.query.js";
import { GetTrendQuery } from "../../../../../src/contexts/reporting/application/queries/get-trend.query.js";
import { CategoryPeriodAggregate } from "../../../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { registerReportingRoutes } from "../../../../../src/contexts/reporting/infrastructure/http/reporting.routes.js";
import { InMemoryCategoryPeriodAggregateRepository } from "../../../../../src/contexts/reporting/infrastructure/persistence/in-memory-category-period-aggregate.repository.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Period } from "../../../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryRepository } from "../../../financial-tracking/doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "../../../financial-tracking/doubles/in-memory-financial-item.repository.js";

describe("Reporting HTTP routes", () => {
  let app: ReturnType<typeof Fastify>;
  let familyId: FamilyId;

  beforeEach(async () => {
    app = Fastify();
    const aggregateRepository = new InMemoryCategoryPeriodAggregateRepository();
    const categoryRepository = new InMemoryCategoryRepository();
    const financialItemRepository = new InMemoryFinancialItemRepository();
    familyId = FamilyId.generate();
    const category = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Supermercado"),
    );
    categoryRepository.add(category);
    const aggregate = CategoryPeriodAggregate.create(
      familyId,
      category.id,
      Period.of(2026, 8),
      Currency.default(),
    );
    aggregate.registerItem(FinancialItemType.Expense, Money.of(25_000, Currency.default()));
    await aggregateRepository.save(aggregate);

    const getCategoriesQuery = new GetCategoriesQuery(categoryRepository);
    const getFinancialItemsQuery = new GetFinancialItemsQuery(financialItemRepository);
    registerReportingRoutes(app, {
      authenticate: (async () => {}) as preHandlerHookHandler,
      requireFamilyMembership: () => (async () => {}) as preHandlerHookHandler,
      getDashboardSummaryQuery: new GetDashboardSummaryQuery(aggregateRepository),
      getCategoryBreakdownQuery: new GetCategoryBreakdownQuery(
        aggregateRepository,
        getCategoriesQuery,
      ),
      getPeriodComparisonQuery: new GetPeriodComparisonQuery(aggregateRepository),
      getTrendQuery: new GetTrendQuery(aggregateRepository),
      getDrillDownQuery: new GetDrillDownQuery(
        new GetCategoryBreakdownQuery(aggregateRepository, getCategoriesQuery),
        getFinancialItemsQuery,
        getCategoriesQuery,
      ),
    });
    await app.ready();
  });

  test("expone dashboard, breakdown, comparison, trend y drilldown", async () => {
    const urls = [
      `/families/${familyId}/dashboard?period=2026-08`,
      `/families/${familyId}/reports/breakdown?period=2026-08`,
      `/families/${familyId}/reports/comparison?periodA=2026-07&periodB=2026-08`,
      `/families/${familyId}/reports/trend?fromPeriod=2026-08&toPeriod=2026-08`,
      `/families/${familyId}/reports/drilldown?period=2026-08`,
    ];

    for (const url of urls) {
      const response = await app.inject({ method: "GET", url });
      assert.equal(response.statusCode, 200, url);
    }

    const dashboard = await app.inject({
      method: "GET",
      url: `/families/${familyId}/dashboard?period=2026-08`,
    });
    assert.equal(JSON.parse(dashboard.body).totalExpenses.amount, 25_000);
  });

  test("rechaza un período con formato inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/dashboard?period=2026-8`,
    });

    assert.equal(response.statusCode, 400);
  });
});
