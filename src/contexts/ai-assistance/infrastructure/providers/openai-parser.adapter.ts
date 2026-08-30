// contexts/ai-assistance/infrastructure/providers/openai-parser.adapter.ts
import type { NaturalLanguageParserPort } from "../../../ai-assistance/domain/ports/natural-languaje-parser.port.js";
import type { ExpenseSuggestion } from "../../../ai-assistance/domain/entities/suggestion.js";

class OpenAINaturalLanguageParser implements NaturalLanguageParserPort {
  async parse(text: string, context: FamilyContext): Promise<ExpenseSuggestion> {
    const rawResponse = await this.openaiClient.chat(...);  // formato específico de OpenAI
    return this.translate(rawResponse);  // ← el Anticorruption Layer real está aquí
  }

  private translate(rawResponse: OpenAIResponseShape): ExpenseSuggestion {
    // traduce el JSON crudo del proveedor a conceptos del dominio (Money, TransactionDate, etc.)
  }
}