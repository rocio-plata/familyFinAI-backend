// src/contexts/financial-tracking/financial-tracking.module.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { requireFamilyMembership } from "../../platform/auth/require-family-membership.middleware.js";
import type { EventBus } from "../../platform/events/event-bus.js";
import type { GetFamilyMembershipQuery } from "../family-access/application/queries/get-family-membership.query.js";
import { AddTagToCategoryUseCase } from "./application/commands/add-tag-to-category.usecase.js";
import { CreateCategoryUseCase } from "./application/commands/create-category.usecase.js";
import { DeprecateCategoryUseCase } from "./application/commands/deprecate-category.usecase.js";
import { DeprecateTagUseCase } from "./application/commands/deprecate-tag.usecase.js";
import { RenameCategoryUseCase } from "./application/commands/rename-category.usecase.js";
import { RenameTagUseCase } from "./application/commands/rename-tag.usecase.js";
import { ReorderCategoryTagsUseCase } from "./application/commands/reorder-category-tags.usecase.js";
import { GetCategoriesQuery } from "./application/queries/get-categories.query.js";
import type { CategoryRepository } from "./domain/repositories/category.repository.js";
import { registerFinancialTrackingRoutes } from "./infrastructure/http/financial-tracking.routes.js";

interface FinancialTrackingModuleDependencies {
  categoryRepository: CategoryRepository;
  eventBus: EventBus;
}

interface FinancialTrackingModule {
  useCases: {
    addTagToCategory: AddTagToCategoryUseCase;
    createCategory: CreateCategoryUseCase;
    deprecateCategory: DeprecateCategoryUseCase;
    deprecateTag: DeprecateTagUseCase;
    getCategories: GetCategoriesQuery;
    renameCategory: RenameCategoryUseCase;
    renameTag: RenameTagUseCase;
    reorderCategoryTags: ReorderCategoryTagsUseCase;
  };
  registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void;
}

function buildFinancialTrackingModule(
  deps: FinancialTrackingModuleDependencies,
  getFamilyMembershipQuery: GetFamilyMembershipQuery,
): FinancialTrackingModule {
  const useCases = {
    addTagToCategory: new AddTagToCategoryUseCase(deps.categoryRepository, deps.eventBus),
    createCategory: new CreateCategoryUseCase(
      deps.categoryRepository,
      getFamilyMembershipQuery,
      deps.eventBus,
    ),
    deprecateCategory: new DeprecateCategoryUseCase(
      deps.categoryRepository,
      getFamilyMembershipQuery,
      deps.eventBus,
    ),
    deprecateTag: new DeprecateTagUseCase(
      deps.categoryRepository,
      getFamilyMembershipQuery,
      deps.eventBus,
    ),
    getCategories: new GetCategoriesQuery(deps.categoryRepository),
    renameCategory: new RenameCategoryUseCase(deps.categoryRepository, getFamilyMembershipQuery),
    renameTag: new RenameTagUseCase(deps.categoryRepository, getFamilyMembershipQuery),
    reorderCategoryTags: new ReorderCategoryTagsUseCase(deps.categoryRepository),
  };

  return {
    useCases,
    registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void {
      registerFinancialTrackingRoutes(app, {
        authenticate,
        addTagToCategoryUseCase: useCases.addTagToCategory,
        createCategoryUseCase: useCases.createCategory,
        deprecateCategoryUseCase: useCases.deprecateCategory,
        deprecateTagUseCase: useCases.deprecateTag,
        getCategoriesQuery: useCases.getCategories,
        renameCategoryUseCase: useCases.renameCategory,
        renameTagUseCase: useCases.renameTag,
        reorderCategoryTagsUseCase: useCases.reorderCategoryTags,
        requireFamilyMembership: (minRole) =>
          requireFamilyMembership(getFamilyMembershipQuery, minRole),
      });
    },
  };
}

export type { FinancialTrackingModule, FinancialTrackingModuleDependencies };
export { buildFinancialTrackingModule };
