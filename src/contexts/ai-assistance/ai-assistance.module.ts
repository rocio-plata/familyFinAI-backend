// src/contexts/ai-assistance/ai-assistance.module.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { requireFamilyMembership } from "../../platform/auth/require-family-membership.middleware.js";
import type { EventBus } from "../../platform/events/event-bus.js";
import type { GetFamilyMembershipQuery } from "../family-access/application/queries/get-family-membership.query.js";
import { FamilyId } from "../family-access/domain/value-objects/family-id.js";
import type { CreateFinancialItemUseCase } from "../financial-tracking/application/commands/create-financial-item.usecase.js";
import type { GetCategoriesQuery } from "../financial-tracking/application/queries/get-categories.query.js";
import { ConfirmSuggestionUseCase } from "./application/commands/confirm-suggestion.usecase.js";
import { DiscardSuggestionUseCase } from "./application/commands/discard-suggestion.usecase.js";
import { ParseNaturalLanguageExpenseUseCase } from "./application/commands/parse-natural-language-expense.usecase.js";
import { ScanReceiptUseCase } from "./application/commands/scan-receipt.usecase.js";
import type { CategoryLookupPort } from "./domain/ports/category-lookup.port.js";
import type { MerchantCategoryHistoryRepository } from "./domain/repositories/merchant-category-history.repository.js";
import type { SuggestionRepository } from "./domain/repositories/suggestion.repository.js";
import { registerAiAssistanceRoutes } from "./infrastructure/http/ai-assistance.routes.js";
import { FakeNaturalLanguageParser } from "./infrastructure/providers/fake-natural-language-parser.adapter.js";
import { FakeReceiptScanner } from "./infrastructure/providers/fake-receipt-scanner.adapter.js";

interface AiAssistanceModuleDependencies {
  suggestionRepository: SuggestionRepository;
  merchantCategoryHistoryRepository: MerchantCategoryHistoryRepository;
  eventBus: EventBus;
  getCategoriesQuery: GetCategoriesQuery;
  getFamilyMembershipQuery: GetFamilyMembershipQuery;
  createFinancialItemUseCase: CreateFinancialItemUseCase;
}

interface AiAssistanceModule {
  useCases: {
    parseNaturalLanguageExpense: ParseNaturalLanguageExpenseUseCase;
    scanReceipt: ScanReceiptUseCase;
    confirmSuggestion: ConfirmSuggestionUseCase;
    discardSuggestion: DiscardSuggestionUseCase;
  };
  registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void;
}

class FinancialTrackingCategoryLookup implements CategoryLookupPort {
  constructor(private readonly getCategoriesQuery: GetCategoriesQuery) {}

  async findByNameHint(familyId: string, nameHint: string): Promise<string | null> {
    const categories = await this.getCategoriesQuery.execute({ familyId: FamilyId.of(familyId) });
    const match = categories.find(
      (category) => category.name.toString().toLowerCase() === nameHint.trim().toLowerCase(),
    );
    return match?.id.toString() ?? null;
  }
}

function buildAiAssistanceModule(deps: AiAssistanceModuleDependencies): AiAssistanceModule {
  const parser = new FakeNaturalLanguageParser();
  const scanner = new FakeReceiptScanner();
  const categoryLookup = new FinancialTrackingCategoryLookup(deps.getCategoriesQuery);
  const useCases = {
    parseNaturalLanguageExpense: new ParseNaturalLanguageExpenseUseCase(
      parser,
      deps.suggestionRepository,
      deps.eventBus,
    ),
    scanReceipt: new ScanReceiptUseCase(
      scanner,
      deps.merchantCategoryHistoryRepository,
      categoryLookup,
      deps.suggestionRepository,
      deps.eventBus,
    ),
    confirmSuggestion: new ConfirmSuggestionUseCase(
      deps.suggestionRepository,
      deps.createFinancialItemUseCase,
      deps.merchantCategoryHistoryRepository,
      deps.eventBus,
    ),
    discardSuggestion: new DiscardSuggestionUseCase(deps.suggestionRepository, deps.eventBus),
  };

  return {
    useCases,
    registerRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler): void {
      void registerAiAssistanceRoutes(app, {
        authenticate,
        requireFamilyMembership: (minRole) =>
          requireFamilyMembership(deps.getFamilyMembershipQuery, minRole),
        parseNaturalLanguageExpenseUseCase: useCases.parseNaturalLanguageExpense,
        scanReceiptUseCase: useCases.scanReceipt,
        confirmSuggestionUseCase: useCases.confirmSuggestion,
        discardSuggestionUseCase: useCases.discardSuggestion,
      });
    },
  };
}

export type { AiAssistanceModule, AiAssistanceModuleDependencies };
export { buildAiAssistanceModule };
