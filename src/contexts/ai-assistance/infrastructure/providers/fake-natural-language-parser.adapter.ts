// src/contexts/ai-assistance/infrastructure/providers/fake-natural-language-parser.adapter.ts

import { TransactionDate } from "../../../../contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import { ExpenseSuggestion } from "../../domain/entities/expense-suggestion.js";
import { UnparseableTextError } from "../../domain/errors/unparseable-text.error.js";
import type {
  FamilyContext,
  NaturalLanguageParserPort,
} from "../../domain/ports/natural-language-parser.port.js";
import { ConfidenceScore } from "../../domain/value-objects/confidence-score.js";
import { SuggestionType } from "../../domain/value-objects/suggestion-type.js";

class FakeNaturalLanguageParser implements NaturalLanguageParserPort {
  async parse(text: string, context: FamilyContext): Promise<ExpenseSuggestion> {
    const amount = extractAmount(text);
    if (amount === null) throw new UnparseableTextError();

    return ExpenseSuggestion.create({
      familyId: context.familyId,
      requestedBy: context.requestedBy,
      rawInput: text,
      suggestedType: SuggestionType.Expense,
      suggestedAmount: Money.of(amount, Currency.default()),
      suggestedCategoryId: null,
      suggestedTagId: null,
      suggestedDate: TransactionDate.of(new Date()),
      confidence: ConfidenceScore.create(0.5),
    });
  }
}

function extractAmount(text: string): number | null {
  const match = text.match(/(?:[$]\s*)?(\d[\d.\s]*(?:,\d{1,2})?)/);
  if (!match?.[1]) return null;

  const normalized = match[1].replace(/[.\s]/g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export { FakeNaturalLanguageParser };
