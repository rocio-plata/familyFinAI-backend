// src/contexts/financial-tracking/financial-tracking.module.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { EventBus } from "../../platform/events/event-bus.js";
import type { GetFamilyMembershipQuery } from "../family-access/application/queries/get-family-membership.query.js";
import { CreateCategoryUseCase } from "./application/commands/create-category.usecase.js";
import type { CategoryRepository } from "./domain/repositories/category.repository.js";
import { registerFinancialTrackingRoutes } from "./infrastructure/http/financial-tracking.routes.js";

interface FinancialTrackingModuleDependencies {
  categoryRepository: CategoryRepository;
  eventBus: EventBus;
}

interface FinancialTrackingModule {
  useCases: {
    createCategory: CreateCategoryUseCase;
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
  };

  return {
    useCases,
    registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void {
      registerFinancialTrackingRoutes(app, {
        authenticate,
        createCategoryUseCase: useCases.createCategory,
      });
    },
  };
}

export type { FinancialTrackingModule, FinancialTrackingModuleDependencies };
export { buildFinancialTrackingModule };
