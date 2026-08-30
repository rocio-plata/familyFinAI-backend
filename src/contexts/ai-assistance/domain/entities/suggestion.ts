// contexts/ai-assistance/domain/entities/suggestion.ts

import { SuggestionId } from "../value-objects/suggestion-id.js";
import { SuggestionStatus } from "../value-objects/suggestion-status.js";
import { FinancialItemType } from "../../../financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import { TagId } from "../../../financial-tracking/domain/value-objects/tag-id.js";
import { TransactionDate } from "../../../financial-tracking/domain/value-objects/transaction-date.js";


class ExpenseSuggestion {
  private constructor(
    private readonly id: SuggestionId,
    private readonly rawInput: string,           // "I spent $25,000 on gas yesterday"
    private readonly suggestedType: FinancialItemType,
    private readonly suggestedAmount: Money,
    private readonly suggestedCategory: CategoryId | null,   // puede no encontrar match
    private readonly suggestedTag: TagId | null,
    private readonly suggestedDate: TransactionDate,
    private readonly confidence: ConfidenceScore,   // VO propio de este contexto
    private status: SuggestionStatus,               // Pending | Confirmed | Discarded
  ) {}

  confirm(editedByUser: Partial<SuggestionFields>): ConfirmedSuggestion {
    // el usuario pudo haber editado antes de confirmar
    this.status = SuggestionStatus.Confirmed;
    return ConfirmedSuggestion.from(this, editedByUser);
  }
}

export { ExpenseSuggestion };
