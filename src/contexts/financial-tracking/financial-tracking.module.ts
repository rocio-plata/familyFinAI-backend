// src/contexts/financial-tracking/financial-tracking.module.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { requireFamilyMembership } from "../../platform/auth/require-family-membership.middleware.js";
import type { EventBus } from "../../platform/events/event-bus.js";
import type { GetFamilyDefaultCurrencyQuery } from "../family-access/application/queries/get-family-default-currency.query.js";
import type { GetFamilyMembershipQuery } from "../family-access/application/queries/get-family-membership.query.js";
import { AddTagToCategoryUseCase } from "./application/commands/add-tag-to-category.usecase.js";
import { CreateCategoryUseCase } from "./application/commands/create-category.usecase.js";
import { CreateFinancialItemUseCase } from "./application/commands/create-financial-item.usecase.js";
import { DeleteCategoryUseCase } from "./application/commands/delete-category.usecase.js";
import { DeleteTagUseCase } from "./application/commands/delete-tag.usecase.js";
import { DeprecateCategoryUseCase } from "./application/commands/deprecate-category.usecase.js";
import { DeprecateTagUseCase } from "./application/commands/deprecate-tag.usecase.js";
import { RenameCategoryUseCase } from "./application/commands/rename-category.usecase.js";
import { RenameTagUseCase } from "./application/commands/rename-tag.usecase.js";
import { ReorderCategoryTagsUseCase } from "./application/commands/reorder-category-tags.usecase.js";
import { GetCategoriesQuery } from "./application/queries/get-categories.query.js";
import type { CategoryRepository } from "./domain/repositories/category.repository.js";
import type { FinancialItemRepository } from "./domain/repositories/financial-item.repository.js";
import { CategoryDeletionService } from "./domain/services/category-deletion.service.js";
import { TagDeletionService } from "./domain/services/tag-deletion.service.js";
import { registerFinancialTrackingRoutes } from "./infrastructure/http/financial-tracking.routes.js";

interface FinancialTrackingModuleDependencies {
  categoryRepository: CategoryRepository;
  financialItemRepository: FinancialItemRepository;
  eventBus: EventBus;
}

interface FinancialTrackingModule {
  useCases: {
    addTagToCategory: AddTagToCategoryUseCase;
    createCategory: CreateCategoryUseCase;
    createFinancialItem: CreateFinancialItemUseCase;
    deleteCategory: DeleteCategoryUseCase;
    deleteTag: DeleteTagUseCase;
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
  getFamilyDefaultCurrencyQuery: GetFamilyDefaultCurrencyQuery,
): FinancialTrackingModule {
  const useCases = {
    addTagToCategory: new AddTagToCategoryUseCase(deps.categoryRepository, deps.eventBus),
    createCategory: new CreateCategoryUseCase(
      deps.categoryRepository,
      getFamilyMembershipQuery,
      deps.eventBus,
    ),
    createFinancialItem: new CreateFinancialItemUseCase(
      deps.financialItemRepository,
      deps.categoryRepository,
      deps.eventBus,
    ),
    deleteCategory: new DeleteCategoryUseCase(
      deps.categoryRepository,
      new CategoryDeletionService(deps.financialItemRepository),
      getFamilyMembershipQuery,
    ),
    deleteTag: new DeleteTagUseCase(
      deps.categoryRepository,
      new TagDeletionService(deps.financialItemRepository),
      getFamilyMembershipQuery,
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
        createFinancialItemUseCase: useCases.createFinancialItem,
        deleteCategoryUseCase: useCases.deleteCategory,
        deleteTagUseCase: useCases.deleteTag,
        deprecateCategoryUseCase: useCases.deprecateCategory,
        deprecateTagUseCase: useCases.deprecateTag,
        getCategoriesQuery: useCases.getCategories,
        renameCategoryUseCase: useCases.renameCategory,
        renameTagUseCase: useCases.renameTag,
        reorderCategoryTagsUseCase: useCases.reorderCategoryTags,
        requireFamilyMembership: (minRole) =>
          requireFamilyMembership(getFamilyMembershipQuery, minRole),
        getFamilyDefaultCurrencyQuery,
      });
    },
  };
}

export type { FinancialTrackingModule, FinancialTrackingModuleDependencies };
export { buildFinancialTrackingModule };
