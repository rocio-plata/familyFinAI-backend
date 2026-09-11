// src/contexts/reporting/infrastructure/http/reporting.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { Role } from "../../../family-access/domain/value-objects/role.js";
import { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import { TagId } from "../../../financial-tracking/domain/value-objects/tag-id.js";
import type { GetCategoryBreakdownQuery } from "../../application/queries/get-category-breakdown.query.js";
import type { GetDashboardSummaryQuery } from "../../application/queries/get-dashboard-summary.query.js";
import type { GetDrillDownQuery } from "../../application/queries/get-drill-down.query.js";
import type { GetPeriodComparisonQuery } from "../../application/queries/get-period-comparison.query.js";
import type { GetTrendQuery } from "../../application/queries/get-trend.query.js";

interface ReportingRoutesDependencies {
  authenticate: preHandlerHookHandler;
  requireFamilyMembership: (minRole?: Role) => preHandlerHookHandler;
  getDashboardSummaryQuery: GetDashboardSummaryQuery;
  getCategoryBreakdownQuery: GetCategoryBreakdownQuery;
  getPeriodComparisonQuery: GetPeriodComparisonQuery;
  getTrendQuery: GetTrendQuery;
  getDrillDownQuery: GetDrillDownQuery;
}

const periodSchema = { type: "string", pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$" };
const idSchema = { type: "string", minLength: 1 };
const familyParams = {
  type: "object",
  required: ["familyId"],
  properties: { familyId: idSchema },
};

function registerReportingRoutes(app: FastifyInstance, deps: ReportingRoutesDependencies): void {
  const preHandler = [deps.authenticate, deps.requireFamilyMembership()];

  app.get(
    "/families/:familyId/dashboard",
    {
      preHandler,
      schema: {
        params: familyParams,
        querystring: { type: "object", properties: { period: periodSchema } },
      },
    },
    async (request) => {
      const { familyId } = request.params as { familyId: string };
      const { period } = request.query as { period?: string };
      const summary = await deps.getDashboardSummaryQuery.execute({
        familyId: FamilyId.of(familyId),
        ...(period ? { period: parsePeriod(period) } : {}),
      });
      return serializeDashboardSummary(summary);
    },
  );

  app.get(
    "/families/:familyId/reports/breakdown",
    {
      preHandler,
      schema: {
        params: familyParams,
        querystring: {
          type: "object",
          required: ["period"],
          properties: {
            period: periodSchema,
            type: { type: "string", enum: ["EXPENSE", "INCOME"] },
          },
        },
      },
    },
    async (request) => {
      const { familyId } = request.params as { familyId: string };
      const { period, type } = request.query as { period: string; type?: "EXPENSE" | "INCOME" };
      const breakdown = await deps.getCategoryBreakdownQuery.execute({
        familyId: FamilyId.of(familyId),
        period: parsePeriod(period),
        ...(type ? { type: toFinancialItemType(type) } : {}),
      });
      return breakdown.map((entry) => ({
        categoryId: entry.categoryId.toString(),
        categoryName: entry.categoryName.toString(),
        amount: entry.amount.amount,
        currency: entry.amount.currency.toString(),
      }));
    },
  );

  app.get(
    "/families/:familyId/reports/comparison",
    {
      preHandler,
      schema: {
        params: familyParams,
        querystring: {
          type: "object",
          required: ["periodA", "periodB"],
          properties: { periodA: periodSchema, periodB: periodSchema, categoryId: idSchema },
        },
      },
    },
    async (request) => {
      const { familyId } = request.params as { familyId: string };
      const { periodA, periodB, categoryId } = request.query as {
        periodA: string;
        periodB: string;
        categoryId?: string;
      };
      const comparison = await deps.getPeriodComparisonQuery.execute({
        familyId: FamilyId.of(familyId),
        periodA: parsePeriod(periodA),
        periodB: parsePeriod(periodB),
        ...(categoryId ? { categoryId: CategoryId.of(categoryId) } : {}),
      });
      return {
        periodA: serializeTotals(comparison.periodA),
        periodB: serializeTotals(comparison.periodB),
        expenseVariation: comparison.expenseVariation,
        incomeVariation: comparison.incomeVariation,
      };
    },
  );

  app.get(
    "/families/:familyId/reports/trend",
    {
      preHandler,
      schema: {
        params: familyParams,
        querystring: {
          type: "object",
          required: ["fromPeriod", "toPeriod"],
          properties: { fromPeriod: periodSchema, toPeriod: periodSchema, categoryId: idSchema },
        },
      },
    },
    async (request) => {
      const { familyId } = request.params as { familyId: string };
      const { fromPeriod, toPeriod, categoryId } = request.query as {
        fromPeriod: string;
        toPeriod: string;
        categoryId?: string;
      };
      const trend = await deps.getTrendQuery.execute({
        familyId: FamilyId.of(familyId),
        fromPeriod: parsePeriod(fromPeriod),
        toPeriod: parsePeriod(toPeriod),
        ...(categoryId ? { categoryId: CategoryId.of(categoryId) } : {}),
      });
      return trend.map((point) => ({
        period: point.period.toString(),
        totalExpenses: serializeMoney(point.totalExpenses),
        totalIncome: serializeMoney(point.totalIncome),
        balance: point.balance,
      }));
    },
  );

  app.get(
    "/families/:familyId/reports/drilldown",
    {
      preHandler,
      schema: {
        params: familyParams,
        querystring: {
          type: "object",
          required: ["period"],
          properties: { period: periodSchema, categoryId: idSchema, tagId: idSchema },
        },
      },
    },
    async (request) => {
      const { familyId } = request.params as { familyId: string };
      const { period, categoryId, tagId } = request.query as {
        period: string;
        categoryId?: string;
        tagId?: string;
      };
      const result = await deps.getDrillDownQuery.execute({
        familyId: FamilyId.of(familyId),
        period: parsePeriod(period),
        ...(categoryId ? { categoryId: CategoryId.of(categoryId) } : {}),
        ...(tagId ? { tagId: TagId.of(tagId) } : {}),
      });
      return serializeDrillDown(result);
    },
  );
}

function parsePeriod(value: string): Period {
  return Period.of(Number(value.slice(0, 4)), Number(value.slice(5, 7)));
}

function toFinancialItemType(value: "EXPENSE" | "INCOME"): FinancialItemType {
  return value === "INCOME" ? FinancialItemType.Income : FinancialItemType.Expense;
}

function serializeMoney(money: { amount: number; currency: { toString(): string } }) {
  return { amount: money.amount, currency: money.currency.toString() };
}

function serializeTotals(totals: {
  totalExpenses: Parameters<typeof serializeMoney>[0];
  totalIncome: Parameters<typeof serializeMoney>[0];
  balance: number;
}) {
  return {
    totalExpenses: serializeMoney(totals.totalExpenses),
    totalIncome: serializeMoney(totals.totalIncome),
    balance: totals.balance,
  };
}

function serializeDashboardSummary(
  summary: Awaited<ReturnType<GetDashboardSummaryQuery["execute"]>>,
) {
  return {
    totalExpenses: serializeMoney(summary.totalExpenses),
    totalIncome: serializeMoney(summary.totalIncome),
    balance: summary.balance,
    categoryBreakdown: summary.categoryBreakdown.map((entry) => ({
      categoryId: entry.categoryId.toString(),
      totalExpense: serializeMoney(entry.totalExpense),
      percentage: entry.percentage,
    })),
  };
}

function serializeDrillDown(result: Awaited<ReturnType<GetDrillDownQuery["execute"]>>) {
  if (result.level === "category") {
    return {
      level: result.level,
      entries: result.entries.map((entry) => ({
        categoryId: entry.categoryId.toString(),
        categoryName: entry.categoryName.toString(),
        amount: serializeMoney(entry.amount),
      })),
    };
  }
  if (result.level === "tag") {
    return {
      level: result.level,
      entries: result.entries.map((entry) => ({
        tagId: entry.tagId.toString(),
        tagName: entry.tagName.toString(),
        amount: serializeMoney(entry.amount),
        itemCount: entry.itemCount,
      })),
    };
  }
  return {
    level: result.level,
    entries: result.entries.map((entry) => ({
      id: entry.id.toString(),
      familyId: entry.familyId.toString(),
      recordedBy: entry.recordedBy.toString(),
      type: entry.type,
      amount: serializeMoney(entry.amount),
      categoryId: entry.categoryId.toString(),
      tagId: entry.tagId?.toString() ?? null,
      title: entry.title.toString(),
      note: entry.note?.toString() ?? null,
      occurredOn: entry.occurredOn.toISOString(),
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export type { ReportingRoutesDependencies };
export { registerReportingRoutes };
