// src/contexts/budgeting/infrastructure/http/budgeting.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import type { GetFamilyDefaultCurrencyQuery } from "../../../family-access/application/queries/get-family-default-currency.query.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { Role } from "../../../family-access/domain/value-objects/role.js";
import { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { CreateBudgetConfigurationUseCase } from "../../application/commands/create-budget-configuration.usecase.js";
import type { DeactivateBudgetConfigurationUseCase } from "../../application/commands/deactivate-budget-configuration.usecase.js";
import type { RemoveBudgetOverrideForPeriodUseCase } from "../../application/commands/remove-budget-override-for-period.usecase.js";
import type { SetBudgetOverrideForPeriodUseCase } from "../../application/commands/set-budget-override-for-period.usecase.js";
import type { UpdateDefaultBudgetAmountUseCase } from "../../application/commands/update-default-budget-amount.usecase.js";
import type { GetBudgetsQuery } from "../../application/queries/get-budgets.query.js";
import { BudgetConfigurationId } from "../../domain/value-objects/budget-configuration-id.js";

interface BudgetingRoutesDependencies {
  authenticate: preHandlerHookHandler;
  requireFamilyMembership: (minRole?: Role) => preHandlerHookHandler;
  getFamilyDefaultCurrencyQuery: GetFamilyDefaultCurrencyQuery;
  createBudgetConfigurationUseCase: CreateBudgetConfigurationUseCase;
  updateDefaultBudgetAmountUseCase: UpdateDefaultBudgetAmountUseCase;
  setBudgetOverrideForPeriodUseCase: SetBudgetOverrideForPeriodUseCase;
  removeBudgetOverrideForPeriodUseCase: RemoveBudgetOverrideForPeriodUseCase;
  deactivateBudgetConfigurationUseCase: DeactivateBudgetConfigurationUseCase;
  getBudgetsQuery: GetBudgetsQuery;
}

const idSchema = { type: "string", minLength: 1 };
const periodSchema = { type: "string", pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$" };
const familyParams = {
  type: "object",
  required: ["familyId"],
  properties: { familyId: idSchema },
};

function registerBudgetingRoutes(app: FastifyInstance, deps: BudgetingRoutesDependencies): void {
  const preHandler = [deps.authenticate, deps.requireFamilyMembership()];

  app.post(
    "/families/:familyId/budgets",
    {
      preHandler,
      schema: {
        params: familyParams,
        body: {
          type: "object",
          required: ["categoryId", "amount"],
          properties: {
            categoryId: idSchema,
            amount: { type: "number", minimum: 0 },
            currency: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const { categoryId, amount, currency } = request.body as {
        categoryId: string;
        amount: number;
        currency?: string;
      };
      const parsedFamilyId = FamilyId.of(familyId);
      const resolvedCurrency = currency
        ? Currency.of(currency)
        : await deps.getFamilyDefaultCurrencyQuery.execute({ familyId: parsedFamilyId });
      const budget = await deps.createBudgetConfigurationUseCase.execute({
        familyId: parsedFamilyId,
        categoryId: parseId(categoryId),
        defaultAmount: Money.of(amount, resolvedCurrency),
      });
      return reply.code(201).send(serializeBudgetConfiguration(budget));
    },
  );

  app.get(
    "/families/:familyId/budgets",
    {
      preHandler,
      schema: {
        params: familyParams,
        querystring: {
          type: "object",
          properties: { period: periodSchema },
        },
      },
    },
    async (request) => {
      const { familyId } = request.params as { familyId: string };
      const { period } = request.query as { period?: string };
      const parsedFamilyId = FamilyId.of(familyId);
      const result = await deps.getBudgetsQuery.execute({
        familyId: parsedFamilyId,
        period: period ? parsePeriod(period) : Period.current(),
      });
      return result.map(serializeBudget);
    },
  );

  app.patch(
    "/families/:familyId/budgets/:budgetConfigurationId",
    {
      preHandler,
      schema: {
        params: {
          type: "object",
          required: ["familyId", "budgetConfigurationId"],
          properties: { familyId: idSchema, budgetConfigurationId: idSchema },
        },
        body: {
          type: "object",
          required: ["amount"],
          properties: {
            amount: { type: "number", minimum: 0 },
            currency: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request) => {
      const { familyId, budgetConfigurationId } = request.params as {
        familyId: string;
        budgetConfigurationId: string;
      };
      const { amount, currency } = request.body as { amount: number; currency?: string };
      const parsedFamilyId = FamilyId.of(familyId);
      const resolvedCurrency = currency
        ? Currency.of(currency)
        : await deps.getFamilyDefaultCurrencyQuery.execute({ familyId: parsedFamilyId });
      const budget = await deps.updateDefaultBudgetAmountUseCase.execute({
        familyId: parsedFamilyId,
        budgetConfigurationId: parseBudgetConfigurationId(budgetConfigurationId),
        newDefaultAmount: Money.of(amount, resolvedCurrency),
      });
      return serializeBudgetConfiguration(budget);
    },
  );

  app.put(
    "/families/:familyId/budgets/:budgetConfigurationId/overrides/:period",
    {
      preHandler,
      schema: {
        params: {
          type: "object",
          required: ["familyId", "budgetConfigurationId", "period"],
          properties: {
            familyId: idSchema,
            budgetConfigurationId: idSchema,
            period: periodSchema,
          },
        },
        body: {
          type: "object",
          required: ["amount"],
          properties: {
            amount: { type: "number", minimum: 0 },
            currency: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request) => {
      const { familyId, budgetConfigurationId, period } = request.params as {
        familyId: string;
        budgetConfigurationId: string;
        period: string;
      };
      const { amount, currency } = request.body as { amount: number; currency?: string };
      const parsedFamilyId = FamilyId.of(familyId);
      const resolvedCurrency = currency
        ? Currency.of(currency)
        : await deps.getFamilyDefaultCurrencyQuery.execute({ familyId: parsedFamilyId });
      const budget = await deps.setBudgetOverrideForPeriodUseCase.execute({
        familyId: parsedFamilyId,
        budgetConfigurationId: parseBudgetConfigurationId(budgetConfigurationId),
        period: parsePeriod(period),
        overrideAmount: Money.of(amount, resolvedCurrency),
      });
      return serializeBudgetConfiguration(budget);
    },
  );

  app.delete(
    "/families/:familyId/budgets/:budgetConfigurationId/overrides/:period",
    {
      preHandler,
      schema: {
        params: {
          type: "object",
          required: ["familyId", "budgetConfigurationId", "period"],
          properties: {
            familyId: idSchema,
            budgetConfigurationId: idSchema,
            period: periodSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, budgetConfigurationId, period } = request.params as {
        familyId: string;
        budgetConfigurationId: string;
        period: string;
      };
      await deps.removeBudgetOverrideForPeriodUseCase.execute({
        familyId: FamilyId.of(familyId),
        budgetConfigurationId: parseBudgetConfigurationId(budgetConfigurationId),
        period: parsePeriod(period),
      });
      return reply.code(204).send();
    },
  );

  app.post(
    "/families/:familyId/budgets/:budgetConfigurationId/deactivate",
    {
      preHandler,
      schema: {
        params: {
          type: "object",
          required: ["familyId", "budgetConfigurationId"],
          properties: { familyId: idSchema, budgetConfigurationId: idSchema },
        },
      },
    },
    async (request) => {
      const { familyId, budgetConfigurationId } = request.params as {
        familyId: string;
        budgetConfigurationId: string;
      };
      const budget = await deps.deactivateBudgetConfigurationUseCase.execute({
        familyId: FamilyId.of(familyId),
        budgetConfigurationId: parseBudgetConfigurationId(budgetConfigurationId),
      });
      return serializeBudgetConfiguration(budget);
    },
  );
}

function parsePeriod(value: string): Period {
  return Period.of(Number(value.slice(0, 4)), Number(value.slice(5, 7)));
}

function parseId(value: string) {
  return CategoryId.of(value);
}

function parseBudgetConfigurationId(value: string) {
  return BudgetConfigurationId.of(value);
}

function serializeMoney(money: { amount: number; currency: { toString(): string } }) {
  return { amount: money.amount, currency: money.currency.toString() };
}

function serializeBudgetConfiguration(budget: {
  id: { toString(): string };
  familyId: { toString(): string };
  categoryId: { toString(): string };
  defaultAmount: { amount: number; currency: { toString(): string } };
  isActive: boolean;
}) {
  return {
    id: budget.id.toString(),
    familyId: budget.familyId.toString(),
    categoryId: budget.categoryId.toString(),
    defaultAmount: serializeMoney(budget.defaultAmount),
    isActive: budget.isActive,
  };
}

function serializeBudget(budget: {
  budgetConfigurationId: string;
  categoryId: string;
  categoryName: { toString(): string };
  period: Period;
  limitAmount: { amount: number; currency: { toString(): string } };
  spent: { amount: number; currency: { toString(): string } };
  remaining: { amount: number; currency: { toString(): string } };
  isOverspent: boolean;
}) {
  return {
    budgetConfigurationId: budget.budgetConfigurationId,
    categoryId: budget.categoryId,
    categoryName: budget.categoryName.toString(),
    period: budget.period.toString(),
    limitAmount: serializeMoney(budget.limitAmount),
    spent: serializeMoney(budget.spent),
    remaining: serializeMoney(budget.remaining),
    isOverspent: budget.isOverspent,
  };
}

export type { BudgetingRoutesDependencies };
export { registerBudgetingRoutes };
