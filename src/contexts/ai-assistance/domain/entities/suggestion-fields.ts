// src/contexts/ai-assistance/domain/entities/suggestion-fields.ts
import type { Money } from "../../../../shared-kernel/domain/money.js";
import type { TransactionDate } from "../../../financial-tracking/domain/value-objects/transaction-date.js";
import type { SuggestionType } from "../value-objects/suggestion-type.js";

type SuggestionEdits = {
  amount?: Money;
  categoryId?: string | null;
  tagId?: string | null;
  occurredOn?: TransactionDate;
  title?: string | null;
};

type SuggestionData = {
  familyId: string;
  requestedBy: string;
  suggestedType: SuggestionType;
  suggestedAmount: Money;
  suggestedCategoryId: string | null;
  suggestedTagId: string | null;
  suggestedDate: TransactionDate;
  suggestedTitle: string | null;
};

export type { SuggestionData, SuggestionEdits };
