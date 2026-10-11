// src/contexts/ai-assistance/domain/entities/receipt-suggestion.ts

import { Currency } from "../../../../shared-kernel/domain/currency.js";
import type { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import { TransactionDate } from "../../../financial-tracking/domain/value-objects/transaction-date.js";
import { SuggestionNotPendingError } from "../errors/suggestion-not-pending.error.js";
import { SuggestionConfirmed } from "../events/suggestion-confirmed.event.js";
import { SuggestionDiscarded } from "../events/suggestion-discarded.event.js";
import { SuggestionGenerated } from "../events/suggestion-generated.event.js";
import { ConfidenceScore } from "../value-objects/confidence-score.js";
import { MerchantName } from "../value-objects/merchant-name.js";
import { ReceiptImageRef } from "../value-objects/receipt-image-ref.js";
import { SuggestionId } from "../value-objects/suggestion-id.js";
import { SuggestionStatus } from "../value-objects/suggestion-status.js";
import { SuggestionType } from "../value-objects/suggestion-type.js";
import { ConfirmedSuggestion } from "./confirmed-suggestion.js";
import type { SuggestionEdits } from "./suggestion-fields.js";

type ReceiptScanProps = {
  familyId: string;
  requestedBy: string;
  receiptImageRef: ReceiptImageRef;
  merchantName: MerchantName;
  suggestedAmount: Money;
  suggestedCategoryId: string | null;
  suggestedTagId: string | null;
  suggestedDate: TransactionDate;
  confidence: ConfidenceScore;
  suggestedTitle?: string | null;
};

type ReconstituteReceiptSuggestionProps = {
  id: string;
  familyId: string;
  requestedBy: string;
  receiptImageRef: string;
  merchantName: string;
  suggestedAmount: number;
  currency: string;
  suggestedCategoryId: string | null;
  suggestedTagId: string | null;
  suggestedDate: Date;
  suggestedTitle: string | null;
  confidence: number;
  status: SuggestionStatus;
};

class ReceiptSuggestion {
  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: SuggestionId,
    private readonly _familyId: string,
    private readonly _requestedBy: string,
    private readonly _receiptImageRef: ReceiptImageRef,
    private readonly _merchantName: MerchantName,
    private readonly _suggestedAmount: Money,
    private readonly _suggestedCategoryId: string | null,
    private readonly _suggestedTagId: string | null,
    private readonly _suggestedDate: TransactionDate,
    private readonly _suggestedTitle: string | null,
    private readonly _confidence: ConfidenceScore,
    private _status: SuggestionStatus,
  ) {}

  get id(): SuggestionId {
    return this._id;
  }
  get familyId(): string {
    return this._familyId;
  }
  get requestedBy(): string {
    return this._requestedBy;
  }
  get receiptImageRef(): ReceiptImageRef {
    return this._receiptImageRef;
  }
  get merchantName(): MerchantName {
    return this._merchantName;
  }
  get suggestedAmount(): Money {
    return this._suggestedAmount;
  }
  get suggestedCategoryId(): string | null {
    return this._suggestedCategoryId;
  }
  get suggestedTagId(): string | null {
    return this._suggestedTagId;
  }
  get suggestedDate(): TransactionDate {
    return this._suggestedDate;
  }
  get suggestedTitle(): string | null {
    return this._suggestedTitle;
  }
  get confidence(): ConfidenceScore {
    return this._confidence;
  }
  get status(): SuggestionStatus {
    return this._status;
  }

  static fromScan(props: ReceiptScanProps): ReceiptSuggestion {
    const suggestion = new ReceiptSuggestion(
      SuggestionId.generate(),
      props.familyId,
      props.requestedBy,
      props.receiptImageRef,
      props.merchantName,
      props.suggestedAmount,
      props.suggestedCategoryId,
      props.suggestedTagId,
      props.suggestedDate,
      props.suggestedTitle ?? null,
      props.confidence,
      SuggestionStatus.Pending,
    );
    suggestion.domainEvents.push(
      new SuggestionGenerated(suggestion.id, suggestion.familyId, "RECEIPT"),
    );
    return suggestion;
  }

  static reconstitute(props: ReconstituteReceiptSuggestionProps): ReceiptSuggestion {
    return new ReceiptSuggestion(
      SuggestionId.of(props.id),
      props.familyId,
      props.requestedBy,
      ReceiptImageRef.create(props.receiptImageRef),
      MerchantName.create(props.merchantName),
      Money.of(props.suggestedAmount, Currency.of(props.currency)),
      props.suggestedCategoryId,
      props.suggestedTagId,
      TransactionDate.of(props.suggestedDate),
      props.suggestedTitle,
      ConfidenceScore.create(props.confidence),
      props.status,
    );
  }

  confirm(edits: SuggestionEdits): ConfirmedSuggestion {
    this.ensurePending();
    this._status = SuggestionStatus.Confirmed;
    const confirmed = ConfirmedSuggestion.create({
      id: this.id,
      familyId: this.familyId,
      requestedBy: this.requestedBy,
      type: SuggestionType.Expense,
      amount: edits.amount ?? this.suggestedAmount,
      categoryId: edits.categoryId === undefined ? this.suggestedCategoryId : edits.categoryId,
      tagId: edits.tagId === undefined ? this.suggestedTagId : edits.tagId,
      occurredOn: edits.occurredOn ?? this.suggestedDate,
      title: edits.title === undefined ? this.suggestedTitle : edits.title,
      source: "RECEIPT",
      merchantName: this.merchantName.toString(),
    });
    this.domainEvents.push(new SuggestionConfirmed(this.id, this.familyId));
    return confirmed;
  }

  discard(): void {
    this.ensurePending();
    this._status = SuggestionStatus.Discarded;
    this.domainEvents.push(new SuggestionDiscarded(this.id, this.familyId));
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }

  private ensurePending(): void {
    if (this.status !== SuggestionStatus.Pending) throw new SuggestionNotPendingError();
  }
}

export type { ReceiptScanProps, ReconstituteReceiptSuggestionProps };
export { ReceiptSuggestion };
