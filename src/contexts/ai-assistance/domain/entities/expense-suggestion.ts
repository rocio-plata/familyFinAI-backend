// src/contexts/ai-assistance/domain/entities/expense-suggestion.ts

import { Currency } from "../../../../shared-kernel/domain/currency.js";
import type { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import { TransactionDate } from "../../../financial-tracking/domain/value-objects/transaction-date.js";
import { SuggestionExpiredError } from "../errors/suggestion-expired.error.js";
import { SuggestionNotPendingError } from "../errors/suggestion-not-pending.error.js";
import { UnparseableTextError } from "../errors/unparseable-text.error.js";
import { SuggestionConfirmed } from "../events/suggestion-confirmed.event.js";
import { SuggestionDiscarded } from "../events/suggestion-discarded.event.js";
import { SuggestionGenerated } from "../events/suggestion-generated.event.js";
import { ConfidenceScore } from "../value-objects/confidence-score.js";
import { SuggestionId } from "../value-objects/suggestion-id.js";
import { SuggestionStatus } from "../value-objects/suggestion-status.js";
import type { SuggestionType } from "../value-objects/suggestion-type.js";
import { ConfirmedSuggestion } from "./confirmed-suggestion.js";
import type { SuggestionData, SuggestionEdits } from "./suggestion-fields.js";

type CreateExpenseSuggestionProps = Omit<SuggestionData, "suggestedTitle"> & {
  rawInput: string;
  confidence: ConfidenceScore;
  suggestedTitle?: string | null;
};

type ReconstituteExpenseSuggestionProps = {
  id: string;
  rawInput: string;
  confidence: number;
  status: SuggestionStatus;
} & Omit<SuggestionData, "suggestedAmount" | "suggestedDate" | "suggestedTitle"> & {
    suggestedAmount: number;
    currency: string;
    suggestedDate: Date;
    suggestedTitle: string | null;
    expiresAt?: Date;
  };

class ExpenseSuggestion {
  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: SuggestionId,
    private readonly _familyId: string,
    private readonly _requestedBy: string,
    private readonly _rawInput: string,
    private readonly _suggestedType: SuggestionType,
    private readonly _suggestedAmount: Money,
    private readonly _suggestedCategoryId: string | null,
    private readonly _suggestedTagId: string | null,
    private readonly _suggestedDate: TransactionDate,
    private readonly _suggestedTitle: string | null,
    private readonly _confidence: ConfidenceScore,
    private _status: SuggestionStatus,
    private readonly _expiresAt: Date,
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
  get rawInput(): string {
    return this._rawInput;
  }
  get suggestedType(): SuggestionType {
    return this._suggestedType;
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

  get expiresAt(): Date {
    return this._expiresAt;
  }

  static create(props: CreateExpenseSuggestionProps): ExpenseSuggestion {
    if (props.rawInput.trim().length === 0) throw new UnparseableTextError();
    const suggestion = new ExpenseSuggestion(
      SuggestionId.generate(),
      props.familyId,
      props.requestedBy,
      props.rawInput.trim(),
      props.suggestedType,
      props.suggestedAmount,
      props.suggestedCategoryId,
      props.suggestedTagId,
      props.suggestedDate,
      props.suggestedTitle ?? null,
      props.confidence,
      SuggestionStatus.Pending,
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );
    suggestion.domainEvents.push(
      new SuggestionGenerated(suggestion.id, suggestion.familyId, "TEXT"),
    );
    return suggestion;
  }

  static reconstitute(props: ReconstituteExpenseSuggestionProps): ExpenseSuggestion {
    return new ExpenseSuggestion(
      SuggestionId.of(props.id),
      props.familyId,
      props.requestedBy,
      props.rawInput,
      props.suggestedType,
      Money.of(props.suggestedAmount, Currency.of(props.currency)),
      props.suggestedCategoryId,
      props.suggestedTagId,
      TransactionDate.of(props.suggestedDate),
      props.suggestedTitle,
      ConfidenceScore.create(props.confidence),
      props.status,
      props.expiresAt ?? new Date(props.suggestedDate.getTime() + 24 * 60 * 60 * 1000),
    );
  }

  confirm(edits: SuggestionEdits): ConfirmedSuggestion {
    this.ensurePending();
    this._status = SuggestionStatus.Confirmed;
    const confirmed = ConfirmedSuggestion.create({
      id: this.id,
      familyId: this.familyId,
      requestedBy: this.requestedBy,
      type: this.suggestedType,
      amount: edits.amount ?? this.suggestedAmount,
      categoryId: edits.categoryId === undefined ? this.suggestedCategoryId : edits.categoryId,
      tagId: edits.tagId === undefined ? this.suggestedTagId : edits.tagId,
      occurredOn: edits.occurredOn ?? this.suggestedDate,
      title: edits.title === undefined ? this.suggestedTitle : edits.title,
      source: "TEXT",
      merchantName: null,
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
    if (this.expiresAt <= new Date()) throw new SuggestionExpiredError();
  }
}

export type { CreateExpenseSuggestionProps, ReconstituteExpenseSuggestionProps };
export { ExpenseSuggestion };
