// src/contexts/ai-assistance/application/commands/discard-suggestion.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { SuggestionNotFoundError } from "../../domain/errors/suggestion-not-found.error.js";
import type { SuggestionRepository } from "../../domain/repositories/suggestion.repository.js";
import type { SuggestionId } from "../../domain/value-objects/suggestion-id.js";

type DiscardSuggestionInput = {
  familyId: FamilyId;
  suggestionId: SuggestionId;
};

class DiscardSuggestionUseCase {
  constructor(
    private readonly suggestionRepository: SuggestionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: DiscardSuggestionInput): Promise<void> {
    const suggestion = await this.suggestionRepository.findById(input.suggestionId);
    if (!suggestion || suggestion.familyId !== input.familyId.toString()) {
      throw new SuggestionNotFoundError(input.suggestionId.toString());
    }

    suggestion.discard();
    await this.suggestionRepository.save(suggestion);

    for (const event of suggestion.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }
  }
}

export type { DiscardSuggestionInput };
export { DiscardSuggestionUseCase };
