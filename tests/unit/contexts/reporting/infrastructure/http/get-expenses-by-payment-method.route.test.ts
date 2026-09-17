// tests/unit/contexts/reporting/infrastructure/http/get-expenses-by-payment-method.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import Fastify, { type preHandlerHookHandler } from "fastify";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { GetCategoriesQuery } from "../../../../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { GetFinancialItemsQuery } from "../../../../../../src/contexts/financial-tracking/application/queries/get-financial-items.query.js";
import { GetPaymentMethodsQuery } from "../../../../../../src/contexts/financial-tracking/application/queries/get-payment-methods.query.js";
import { PaymentMethod } from "../../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { FinancialItemType } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { PaymentMethodName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryPaymentMethodRepository } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/in-memory-payment-method.repository.js";
import { GetCategoryBreakdownQuery } from "../../../../../../src/contexts/reporting/application/queries/get-category-breakdown.query.js";
import { GetDashboardSummaryQuery } from "../../../../../../src/contexts/reporting/application/queries/get-dashboard-summary.query.js";
import { GetDrillDownQuery } from "../../../../../../src/contexts/reporting/application/queries/get-drill-down.query.js";
import { GetExpensesByPaymentMethodQuery } from "../../../../../../src/contexts/reporting/application/queries/get-expenses-by-payment-method.query.js";
import { GetPeriodComparisonQuery } from "../../../../../../src/contexts/reporting/application/queries/get-period-comparison.query.js";
import { GetTrendQuery } from "../../../../../../src/contexts/reporting/application/queries/get-trend.query.js";
import { PaymentMethodPeriodAggregate } from "../../../../../../src/contexts/reporting/domain/entities/payment-method-period-aggregate.js";
import { registerReportingRoutes } from "../../../../../../src/contexts/reporting/infrastructure/http/reporting.routes.js";
import { InMemoryCategoryPeriodAggregateRepository } from "../../../../../../src/contexts/reporting/infrastructure/persistence/in-memory-category-period-aggregate.repository.js";
import { InMemoryPaymentMethodPeriodAggregateRepository } from "../../../../../../src/contexts/reporting/infrastructure/persistence/in-memory-payment-method-period-aggregate.repository.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../../src/shared-kernel/domain/money.js";
import { Period } from "../../../../../../src/shared-kernel/domain/period.js";
import { InMemoryCategoryRepository } from "../../../financial-tracking/doubles/in-memory-category.repository.js";
import { InMemoryFinancialItemRepository } from "../../../financial-tracking/doubles/in-memory-financial-item.repository.js";

describe("GET /families/:familyId/reports/by-payment-method", () => {
  let app: ReturnType<typeof Fastify>;
  let familyId: FamilyId;

  beforeEach(async () => {
    app = Fastify();
    const paymentMethodAggregateRepository = new InMemoryPaymentMethodPeriodAggregateRepository();
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    familyId = FamilyId.generate();

    const cash = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo"));
    const card = PaymentMethod.create(familyId, PaymentMethodName.of("Tarjeta"));
    await paymentMethodRepository.save(cash);
    await paymentMethodRepository.save(card);

    const period = Period.of(2026, 8);
    const cashAggregate = PaymentMethodPeriodAggregate.create(
      familyId,
      cash.id,
      period,
      Currency.default(),
    );
    cashAggregate.registerItem(FinancialItemType.Expense, Money.of(15_000, Currency.default()));
    await paymentMethodAggregateRepository.save(cashAggregate);

    const cardAggregate = PaymentMethodPeriodAggregate.create(
      familyId,
      card.id,
      period,
      Currency.default(),
    );
    cardAggregate.registerItem(FinancialItemType.Expense, Money.of(9_000, Currency.default()));
    await paymentMethodAggregateRepository.save(cardAggregate);

    const categoryRepository = new InMemoryCategoryRepository();
    const financialItemRepository = new InMemoryFinancialItemRepository();
    const getCategoriesQuery = new GetCategoriesQuery(categoryRepository);
    const getFinancialItemsQuery = new GetFinancialItemsQuery(financialItemRepository);
    const getPaymentMethodsQuery = new GetPaymentMethodsQuery(paymentMethodRepository);
    const aggregateRepository = new InMemoryCategoryPeriodAggregateRepository();

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
      getExpensesByPaymentMethodQuery: new GetExpensesByPaymentMethodQuery(
        paymentMethodAggregateRepository,
        getPaymentMethodsQuery,
      ),
    });
    await app.ready();
  });

  test("devuelve los gastos del período agrupados por medio de pago", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId.toString()}/reports/by-payment-method?period=2026-08`,
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body) as {
      paymentMethodId: string;
      paymentMethodName: string;
      amount: number;
      currency: string;
    }[];
    assert.equal(body.length, 2);
    const cashEntry = body.find((entry) => entry.paymentMethodName === "Efectivo");
    const cardEntry = body.find((entry) => entry.paymentMethodName === "Tarjeta");
    assert.equal(cashEntry?.amount, 15_000);
    assert.equal(cashEntry?.currency, "CLP");
    assert.equal(cardEntry?.amount, 9_000);
  });

  test("devuelve un array vacío para un período sin movimientos", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId.toString()}/reports/by-payment-method?period=2026-01`,
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), []);
  });

  test("rechaza la consulta sin el parámetro period", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId.toString()}/reports/by-payment-method`,
    });

    assert.equal(response.statusCode, 400);
  });

  test("rechaza un period con formato inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId.toString()}/reports/by-payment-method?period=2026-13`,
    });

    assert.equal(response.statusCode, 400);
  });
});
