// tests/unit/contexts/reporting/infrastructure/http/reporting.routes.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import Fastify, { type preHandlerHookHandler } from "fastify";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { GetCategoriesQuery } from "../../../../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { GetFinancialItemsQuery } from "../../../../../../src/contexts/financial-tracking/application/queries/get-financial-items.query.js";
import { Category } from "../../../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryColor } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-color.js";
import { CategoryName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { GetCategoryBreakdownQuery } from "../../../../../../src/contexts/reporting/application/queries/get-category-breakdown.query.js";
import { GetDashboardSummaryQuery } from "../../../../../../src/contexts/reporting/application/queries/get-dashboard-summary.query.js";
import { GetDrillDownQuery } from "../../../../../../src/contexts/reporting/application/queries/get-drill-down.query.js";
import { GetPeriodComparisonQuery } from "../../../../../../src/contexts/reporting/application/queries/get-period-comparison.query.js";
import { GetTrendQuery } from "../../../../../../src/contexts/reporting/application/queries/get-trend.query.js";
import { CategoryPeriodAggregate } from "../../../../../../src/contexts/reporting/domain/entities/category-period-aggregate.js";
import { registerReportingRoutes } from "../../../../../../src/contexts/reporting/infrastructure/http/reporting.routes.js";
import { InMemoryCategoryPeriodAggregateRepository } from "../../../../../../src/contexts/reporting/infrastructure/persistence/in-memory-category-period-aggregate.repository.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../../src/shared-kernel/domain/money.js";
import { Period } from "../../../../../../src/shared-kernel/domain/period.js";
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
      undefined,
      CategoryColor.of("teal_500"),
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
      getDashboardSummaryQuery: new GetDashboardSummaryQuery(
        aggregateRepository,
        getCategoriesQuery,
      ),
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

  test("el dashboard expone la forma con desglose de gastos e ingresos", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/dashboard?period=2026-08`,
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.period, "2026-08");
    assert.equal(body.currency, "CLP");
    assert.deepEqual(body.totalExpenses, { amount: 25_000, currency: "CLP" });
    assert.deepEqual(body.totalIncome, { amount: 0, currency: "CLP" });
    assert.deepEqual(body.balance, { amount: -25_000, currency: "CLP" });
    assert.equal(body.categoryBreakdown, undefined);
    assert.deepEqual(body.incomeByCategory, []);
    assert.equal(body.expenseByCategory.length, 1);
    const [entry] = body.expenseByCategory;
    assert.equal(entry.name, "Supermercado");
    assert.equal(entry.icon, null);
    assert.equal(entry.color, "teal_500");
    assert.equal(entry.status, "ACTIVE");
    assert.deepEqual(entry.amount, { amount: 25_000, currency: "CLP" });
    assert.equal(entry.percentage, 100);
  });

  test("incluye el color de la categoría en dashboard, breakdown y drilldown", async () => {
    const dashboard = await app.inject({
      method: "GET",
      url: `/families/${familyId}/dashboard?period=2026-08`,
    });
    assert.equal(JSON.parse(dashboard.body).expenseByCategory[0].color, "teal_500");

    const breakdown = await app.inject({
      method: "GET",
      url: `/families/${familyId}/reports/breakdown?period=2026-08`,
    });
    assert.equal(JSON.parse(breakdown.body)[0].color, "teal_500");

    const drilldown = await app.inject({
      method: "GET",
      url: `/families/${familyId}/reports/drilldown?period=2026-08`,
    });
    assert.equal(JSON.parse(drilldown.body).entries[0].color, "teal_500");
  });

  test("rechaza un período con formato inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/dashboard?period=2026-8`,
    });

    assert.equal(response.statusCode, 400);
  });
});
