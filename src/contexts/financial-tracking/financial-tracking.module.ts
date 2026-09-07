// src/contexts/financial-tracking/financial-tracking.module.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { requireFamilyMembership } from "../../platform/auth/require-family-membership.middleware.js";
import type { EventBus } from "../../platform/events/event-bus.js";
import type { GetFamilyMembershipQuery } from "../family-access/application/queries/get-family-membership.query.js";
import { CreateCategoryUseCase } from "./application/commands/create-category.usecase.js";
import { GetCategoriesQuery } from "./application/queries/get-categories.query.js";
import type { CategoryRepository } from "./domain/repositories/category.repository.js";
import { registerFinancialTrackingRoutes } from "./infrastructure/http/financial-tracking.routes.js";

interface FinancialTrackingModuleDependencies {
  categoryRepository: CategoryRepository;
  eventBus: EventBus;
}

interface FinancialTrackingModule {
  useCases: {
    createCategory: CreateCategoryUseCase;
    getCategories: GetCategoriesQuery;
  };
  registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void;
}

function buildFinancialTrackingModule(
  deps: FinancialTrackingModuleDependencies,
  getFamilyMembershipQuery: GetFamilyMembershipQuery,
): FinancialTrackingModule {
  const useCases = {
    createCategory: new CreateCategoryUseCase(
      deps.categoryRepository,
      getFamilyMembershipQuery,
      deps.eventBus,
    ),
    getCategories: new GetCategoriesQuery(deps.categoryRepository),
  };

  return {
    useCases,
    registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void {
      registerFinancialTrackingRoutes(app, {
        authenticate,
        createCategoryUseCase: useCases.createCategory,
        getCategoriesQuery: useCases.getCategories,
        requireFamilyMembership: () => requireFamilyMembership(getFamilyMembershipQuery),
      });
    },
  };
}

export type { FinancialTrackingModule, FinancialTrackingModuleDependencies };
export { buildFinancialTrackingModule };
