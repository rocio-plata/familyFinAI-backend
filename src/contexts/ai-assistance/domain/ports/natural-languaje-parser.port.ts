// contexts/ai-assistance/domain/ports/natural-language-parser.port.ts

import { ExpenseSuggestion } from "../entities/suggestion.js";

interface NaturalLanguageParserPort {
  parse(text: string, context: FamilyContext): Promise<ExpenseSuggestion>;
}

export type { NaturalLanguageParserPort };