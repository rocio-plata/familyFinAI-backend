// src/contexts/ai-assistance/domain/events/suggestion-generated.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { SuggestionId } from "../value-objects/suggestion-id.js";

class SuggestionGenerated extends DomainEvent {
  readonly eventName = "ai-assistance.suggestion-generated";

  constructor(
    readonly suggestionId: SuggestionId,
    readonly familyId: string,
    readonly source: "TEXT" | "RECEIPT",
  ) {
    super();
  }
}

export { SuggestionGenerated };
