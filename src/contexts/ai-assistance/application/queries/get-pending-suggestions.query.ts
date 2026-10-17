// src/contexts/ai-assistance/application/queries/get-pending-suggestions.query.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type {
  Suggestion,
  SuggestionRepository,
} from "../../domain/repositories/suggestion.repository.js";
import { SuggestionStatus } from "../../domain/value-objects/suggestion-status.js";

interface GetPendingSuggestionsInput {
  familyId: FamilyId;
  requestedBy: UserId;
}

class GetPendingSuggestionsQuery {
  constructor(private readonly suggestionRepository: SuggestionRepository) {}

  async execute(input: GetPendingSuggestionsInput): Promise<Suggestion[]> {
    const suggestions = await this.suggestionRepository.findByFamilyIdAndRequestedBy(
      input.familyId.toString(),
      input.requestedBy.toString(),
    );
    return suggestions.filter((suggestion) => suggestion.status === SuggestionStatus.Pending);
  }
}

export type { GetPendingSuggestionsInput };
export { GetPendingSuggestionsQuery };
