// src/contexts/ai-assistance/domain/events/suggestion-confirmed.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { SuggestionId } from "../value-objects/suggestion-id.js";

class SuggestionConfirmed extends DomainEvent {
  readonly eventName = "ai-assistance.suggestion-confirmed";

  constructor(
    readonly suggestionId: SuggestionId,
    readonly familyId: string,
  ) {
    super();
  }
}

export { SuggestionConfirmed };
