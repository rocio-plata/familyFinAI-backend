// src/contexts/ai-assistance/domain/entities/confirmed-suggestion.ts
import type { Money } from "../../../../shared-kernel/domain/money.js";
import type { TransactionDate } from "../../../financial-tracking/domain/value-objects/transaction-date.js";
import type { SuggestionId } from "../value-objects/suggestion-id.js";
import type { SuggestionType } from "../value-objects/suggestion-type.js";

type ConfirmedSuggestionProps = {
  id: SuggestionId;
  familyId: string;
  requestedBy: string;
  type: SuggestionType;
  amount: Money;
  categoryId: string | null;
  tagId: string | null;
  occurredOn: TransactionDate;
  title: string | null;
  source: "TEXT" | "RECEIPT";
  merchantName: string | null;
};

class ConfirmedSuggestion {
  private constructor(private readonly props: ConfirmedSuggestionProps) {}

  static create(props: ConfirmedSuggestionProps): ConfirmedSuggestion {
    return new ConfirmedSuggestion(props);
  }

  static reconstitute(props: ConfirmedSuggestionProps): ConfirmedSuggestion {
    return new ConfirmedSuggestion(props);
  }

  get id(): SuggestionId {
    return this.props.id;
  }
  get familyId(): string {
    return this.props.familyId;
  }
  get requestedBy(): string {
    return this.props.requestedBy;
  }
  get type(): SuggestionType {
    return this.props.type;
  }
  get amount(): Money {
    return this.props.amount;
  }
  get categoryId(): string | null {
    return this.props.categoryId;
  }
  get tagId(): string | null {
    return this.props.tagId;
  }
  get occurredOn(): TransactionDate {
    return this.props.occurredOn;
  }
  get title(): string | null {
    return this.props.title;
  }
  get source(): "TEXT" | "RECEIPT" {
    return this.props.source;
  }
  get merchantName(): string | null {
    return this.props.merchantName;
  }
}

export type { ConfirmedSuggestionProps };
export { ConfirmedSuggestion };
