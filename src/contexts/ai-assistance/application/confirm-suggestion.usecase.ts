// contexts/ai-assistance/application/confirm-suggestion.usecase.ts

import { SuggestionId } from "../domain/value-objects/suggestion-id.js";


class ConfirmSuggestionUseCase {
  constructor(
    private readonly suggestionRepository: SuggestionRepository,
    private readonly createFinancialItem: CreateFinancialItemUseCase,  // caso de uso de OTRO contexto
  ) {}

  async execute(suggestionId: SuggestionId, edits: EditedFields): Promise<void> {
    const suggestion = await this.suggestionRepository.findById(suggestionId);
    const confirmed = suggestion.confirm(edits);

    // se llama al caso de uso público de Financial Tracking, no a su dominio interno
    await this.createFinancialItem.execute({
      familyId: confirmed.familyId,
      type: confirmed.type,
      amount: confirmed.amount,
      category: confirmed.category,
      // ...
    });
  }
}