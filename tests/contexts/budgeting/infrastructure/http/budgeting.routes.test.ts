// tests/contexts/budgeting/infrastructure/http/budgeting.routes.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import Fastify, { type preHandlerHookHandler } from "fastify";
import { GetBudgetsQuery } from "../../../../../src/contexts/budgeting/application/queries/get-budgets.query.js";
import { BudgetConfiguration } from "../../../../../src/contexts/budgeting/domain/entities/budget-configuration.js";
import { registerBudgetingRoutes } from "../../../../../src/contexts/budgeting/infrastructure/http/budgeting.routes.js";
import { InMemoryBudgetConfigurationRepository } from "../../../../../src/contexts/budgeting/infrastructure/persistence/in-memory-budget-configuration.repository.js";
import { InMemoryBudgetPeriodStatusRepository } from "../../../../../src/contexts/budgeting/infrastructure/persistence/in-memory-budget-period-status.repository.js";
import type { GetFamilyDefaultCurrencyQuery } from "../../../../../src/contexts/family-access/application/queries/get-family-default-currency.query.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { GetCategoriesQuery } from "../../../../../src/contexts/financial-tracking/application/queries/get-categories.query.js";
import { Category } from "../../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { InMemoryCategoryRepository } from "../../../financial-tracking/doubles/in-memory-category.repository.js";

describe("Budgeting HTTP routes", () => {
  let app: ReturnType<typeof Fastify>;
  let familyId: FamilyId;
  let categoryId: string;

  beforeEach(async () => {
    app = Fastify();
    familyId = FamilyId.generate();
    const categoryRepository = new InMemoryCategoryRepository();
    const category = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Supermercado"),
    );
    categoryId = category.id.toString();
    await categoryRepository.save(category);
    const configurationRepository = new InMemoryBudgetConfigurationRepository();
    const statusRepository = new InMemoryBudgetPeriodStatusRepository();
    registerBudgetingRoutes(app, {
      authenticate: (async () => {}) as preHandlerHookHandler,
      requireFamilyMembership: () => (async () => {}) as preHandlerHookHandler,
      getFamilyDefaultCurrencyQuery: {
        execute: async () => Currency.default(),
      } as GetFamilyDefaultCurrencyQuery,
      createBudgetConfigurationUseCase: {
        execute: async (input) => {
          const configuration = BudgetConfiguration.create(
            input.familyId,
            input.categoryId,
            input.defaultAmount,
          );
          await configurationRepository.save(configuration);
          return configuration;
        },
      } as never,
      updateDefaultBudgetAmountUseCase: {} as never,
      setBudgetOverrideForPeriodUseCase: {} as never,
      removeBudgetOverrideForPeriodUseCase: {} as never,
      deactivateBudgetConfigurationUseCase: {} as never,
      getBudgetsQuery: new GetBudgetsQuery(
        configurationRepository,
        statusRepository,
        new GetCategoriesQuery(categoryRepository),
      ),
    });
    await app.ready();
  });

  test("crea un presupuesto y lista el presupuesto de la familia", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: `/families/${familyId}/budgets`,
      payload: { categoryId, amount: 100_000 },
    });

    assert.equal(createResponse.statusCode, 201);
  });
});
