// src/contexts/ai-assistance/domain/events/suggestion-discarded.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { SuggestionId } from "../value-objects/suggestion-id.js";

class SuggestionDiscarded extends DomainEvent {
  readonly eventName = "ai-assistance.suggestion-discarded";

  constructor(
    readonly suggestionId: SuggestionId,
    readonly familyId: string,
  ) {
    super();
  }
}

export { SuggestionDiscarded };
