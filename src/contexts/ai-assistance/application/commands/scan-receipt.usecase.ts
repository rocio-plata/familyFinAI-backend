// src/contexts/ai-assistance/application/commands/scan-receipt.usecase.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { ReceiptSuggestion } from "../../domain/entities/receipt-suggestion.js";
import { UnreadableReceiptError } from "../../domain/errors/unreadable-receipt.error.js";
import type { CategoryLookupPort } from "../../domain/ports/category-lookup.port.js";
import type { FamilyContext } from "../../domain/ports/natural-language-parser.port.js";
import type { ReceiptImage, ReceiptScanResult, ReceiptScannerPort } from "../../domain/ports/receipt-scanner.port.js";
import type { MerchantCategoryHistoryRepository } from "../../domain/repositories/merchant-category-history.repository.js";
import type { SuggestionRepository } from "../../domain/repositories/suggestion.repository.js";
import { ConfidenceScore } from "../../domain/value-objects/confidence-score.js";
import { MerchantName } from "../../domain/value-objects/merchant-name.js";
import { ReceiptImageRef } from "../../domain/value-objects/receipt-image-ref.js";
import { TransactionDate } from "../../../financial-tracking/domain/value-objects/transaction-date.js";

type ScanReceiptInput = {
  familyId: FamilyId;
  requestedBy: UserId;
  image: ReceiptImage;
};

class ScanReceiptUseCase {
  constructor(
    private readonly scanner: ReceiptScannerPort,
    private readonly merchantHistoryRepository: MerchantCategoryHistoryRepository,
    private readonly categoryLookup: CategoryLookupPort,
    private readonly suggestionRepository: SuggestionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: ScanReceiptInput): Promise<ReceiptSuggestion> {
    const context: FamilyContext = {
      familyId: input.familyId.toString(),
      requestedBy: input.requestedBy.toString(),
    };
    const merchantHint = input.image.merchantNameHint
      ? MerchantName.create(input.image.merchantNameHint)
      : null;
    const knownHistory = merchantHint
      ? await this.merchantHistoryRepository.findByMerchant(context.familyId, merchantHint)
      : null;

    let scanResult: ReceiptScanResult;
    if (knownHistory && merchantHint) {
      scanResult = this.createResultFromKnownMetadata(input.image, merchantHint);
    } else {
      scanResult = await this.scanner.scan(input.image, context);
    }
    this.ensureReadable(scanResult);

    const categoryId = knownHistory
      ? knownHistory.categoryId
      : scanResult.suggestedCategoryHint
        ? await this.categoryLookup.findByNameHint(
            context.familyId,
            scanResult.suggestedCategoryHint,
          )
        : null;
    const suggestion = ReceiptSuggestion.fromScan({
      familyId: context.familyId,
      requestedBy: context.requestedBy,
      receiptImageRef: ReceiptImageRef.create(input.image.reference),
      merchantName: MerchantName.create(scanResult.merchantName),
      suggestedAmount: Money.of(scanResult.totalAmount, Currency.of(scanResult.currency)),
      suggestedCategoryId: categoryId,
      suggestedTagId: knownHistory?.tagId ?? null,
      suggestedDate: TransactionDate.of(scanResult.date ?? input.image.dateHint ?? new Date()),
      confidence: ConfidenceScore.create(0.5),
      suggestedTitle: scanResult.merchantName,
    });

    await this.suggestionRepository.save(suggestion);
    for (const event of suggestion.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }
    return suggestion;
  }

  private createResultFromKnownMetadata(
    image: ReceiptImage,
    merchantName: MerchantName,
  ): ReceiptScanResult {
    return {
      merchantName: merchantName.toString(),
      totalAmount: image.amountHint ?? 0,
      currency: "CLP",
      date: image.dateHint ?? null,
      suggestedCategoryHint: null,
    };
  }

  private ensureReadable(result: ReceiptScanResult): void {
    if (!Number.isFinite(result.totalAmount) || result.totalAmount <= 0) {
      throw new UnreadableReceiptError();
    }
  }
}

export type { ScanReceiptInput };
export { ScanReceiptUseCase };