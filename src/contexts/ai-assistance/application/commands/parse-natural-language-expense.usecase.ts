// src/contexts/ai-assistance/application/commands/parse-natural-language-expense.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { ExpenseSuggestion } from "../../domain/entities/expense-suggestion.js";
import type { NaturalLanguageParserPort } from "../../domain/ports/natural-language-parser.port.js";
import type { SuggestionRepository } from "../../domain/repositories/suggestion.repository.js";

type ParseNaturalLanguageExpenseInput = {
  familyId: FamilyId;
  requestedBy: UserId;
  rawText: string;
};

class ParseNaturalLanguageExpenseUseCase {
  constructor(
    private readonly parser: NaturalLanguageParserPort,
    private readonly suggestionRepository: SuggestionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: ParseNaturalLanguageExpenseInput): Promise<ExpenseSuggestion> {
    const suggestion = await this.parser.parse(input.rawText, {
      familyId: input.familyId.toString(),
      requestedBy: input.requestedBy.toString(),
    });

    await this.suggestionRepository.save(suggestion);

    for (const event of suggestion.pullDomainEvents()) {
      await this.eventBus.publish(event);
    }

    return suggestion;
  }
}

export type { ParseNaturalLanguageExpenseInput };
export { ParseNaturalLanguageExpenseUseCase };
