// contexts/ai-assistance/domain/entities/receipt-suggestion.ts

import type { SuggestionId } from "../value-objects/suggestion-id.js";
import { SuggestionStatus } from "../value-objects/suggestion-status.js";
import type {Money} from "../../../financial-tracking/domain/value-objects/money.js";
import type { CategoryId } from "../../../financial-tracking/domain/value-objects/category-id.js";
import type { TagId } from "../../../financial-tracking/domain/value-objects/tag-id.js";
import type { TransactionDate } from "../../../financial-tracking/domain/value-objects/transaction-date.js";

class ReceiptSuggestion {
  private constructor(
    private readonly id: SuggestionId,
    private readonly receiptImageRef: ReceiptImageRef,   // referencia al archivo, no el binario
    private readonly merchantName: MerchantName,
    private readonly suggestedAmount: Money,
    private readonly suggestedCategory: CategoryId | null,
    private readonly suggestedTag: TagId | null,
    private readonly suggestedDate: TransactionDate,
    private readonly confidence: ConfidenceScore,
    private status: SuggestionStatus,   // Pending | Confirmed | Discarded
  ) {}

  static fromScan(props: ReceiptScanResult): ReceiptSuggestion {
    // invariante clave: SIEMPRE un único FinancialItem por recibo
    // no existe forma de que este constructor produzca múltiples suggestions de un mismo scan
    return new ReceiptSuggestion(/* ... */);
  }

  confirm(edits: Partial<ReceiptSuggestionFields>): ConfirmedSuggestion {
    this.status = SuggestionStatus.Confirmed;
    return ConfirmedSuggestion.from(this, edits);
  }

  discard(): void {
    this.status = SuggestionStatus.Discarded;
  }
}

export { ReceiptSuggestion };