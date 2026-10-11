// src/contexts/ai-assistance/domain/ports/natural-language-parser.port.ts
import type { ExpenseSuggestion } from "../entities/expense-suggestion.js";

type FamilyContext = {
  familyId: string;
  requestedBy: string;
};

interface NaturalLanguageParserPort {
  parse(text: string, context: FamilyContext): Promise<ExpenseSuggestion>;
}

export type { FamilyContext, NaturalLanguageParserPort };
