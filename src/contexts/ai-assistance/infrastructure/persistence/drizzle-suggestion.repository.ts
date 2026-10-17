// src/contexts/ai-assistance/infrastructure/persistence/drizzle-suggestion.repository.ts
import { eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import { ExpenseSuggestion } from "../../domain/entities/expense-suggestion.js";
import { ReceiptSuggestion } from "../../domain/entities/receipt-suggestion.js";
import type {
  Suggestion,
  SuggestionRepository,
} from "../../domain/repositories/suggestion.repository.js";
import { SuggestionStatus } from "../../domain/value-objects/suggestion-status.js";
import { SuggestionType } from "../../domain/value-objects/suggestion-type.js";
import { suggestions } from "./schema.js";

class DrizzleSuggestionRepository implements SuggestionRepository {
  async save(suggestion: Suggestion): Promise<void> {
    const isReceipt = "merchantName" in suggestion;
    await db
      .insert(suggestions)
      .values({
        id: suggestion.id.toString(),
        familyId: suggestion.familyId,
        requestedBy: suggestion.requestedBy,
        source: isReceipt ? "RECEIPT" : "TEXT",
        suggestedType: suggestion.suggestedType,
        rawInput: isReceipt ? null : suggestion.rawInput,
        receiptImageRef: isReceipt ? suggestion.receiptImageRef.toString() : null,
        merchantName: isReceipt ? suggestion.merchantName.toString() : null,
        suggestedAmountMinor: suggestion.suggestedAmount.minorUnits,
        suggestedCurrency: suggestion.suggestedAmount.currency.toString(),
        suggestedCategoryId: suggestion.suggestedCategoryId,
        suggestedTagId: suggestion.suggestedTagId,
        suggestedDate: suggestion.suggestedDate.value,
        suggestedTitle: suggestion.suggestedTitle,
        confidence: suggestion.confidence.value,
        status: suggestion.status,
      })
      .onConflictDoUpdate({
        target: suggestions.id,
        set: {
          suggestedCategoryId: suggestion.suggestedCategoryId,
          suggestedTagId: suggestion.suggestedTagId,
          suggestedDate: suggestion.suggestedDate.value,
          suggestedTitle: suggestion.suggestedTitle,
          status: suggestion.status,
        },
      });
  }

  async findById(
    suggestionId: import("../../domain/value-objects/suggestion-id.js").SuggestionId,
  ): Promise<Suggestion | null> {
    const row = (
      await db
        .select()
        .from(suggestions)
        .where(eq(suggestions.id, suggestionId.toString()))
        .limit(1)
    )[0];
    if (!row) return null;

    const base = {
      id: row.id,
      familyId: row.familyId,
      requestedBy: row.requestedBy,
      suggestedAmount: row.suggestedAmountMinor,
      currency: row.suggestedCurrency,
      suggestedCategoryId: row.suggestedCategoryId,
      suggestedTagId: row.suggestedTagId,
      suggestedDate: row.suggestedDate,
      suggestedTitle: row.suggestedTitle,
      confidence: row.confidence,
      status: toSuggestionStatus(row.status),
      suggestedType:
        row.suggestedType === "INCOME" ? SuggestionType.Income : SuggestionType.Expense,
    };

    if (row.source === "RECEIPT" && row.merchantName && row.receiptImageRef) {
      return ReceiptSuggestion.reconstitute({
        ...base,
        merchantName: row.merchantName,
        receiptImageRef: row.receiptImageRef,
      });
    }
    if (row.source === "TEXT" && row.rawInput !== null) {
      return ExpenseSuggestion.reconstitute({ ...base, rawInput: row.rawInput });
    }
    return null;
  }
}

function toSuggestionStatus(status: "PENDING" | "CONFIRMED" | "DISCARDED"): SuggestionStatus {
  if (status === "CONFIRMED") return SuggestionStatus.Confirmed;
  if (status === "DISCARDED") return SuggestionStatus.Discarded;
  return SuggestionStatus.Pending;
}

export { DrizzleSuggestionRepository };
