// tests/unit/contexts/ai-assistance/application/parse-natural-language-expense.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ParseNaturalLanguageExpenseUseCase } from "../../../../../src/contexts/ai-assistance/application/commands/parse-natural-language-expense.usecase.js";
import type { ExpenseSuggestion } from "../../../../../src/contexts/ai-assistance/domain/entities/expense-suggestion.js";
import { ExpenseSuggestion as ExpenseSuggestionEntity } from "../../../../../src/contexts/ai-assistance/domain/entities/expense-suggestion.js";
import { UnparseableTextError } from "../../../../../src/contexts/ai-assistance/domain/errors/unparseable-text.error.js";
import { SuggestionGenerated } from "../../../../../src/contexts/ai-assistance/domain/events/suggestion-generated.event.js";
import type {
  FamilyContext,
  NaturalLanguageParserPort,
} from "../../../../../src/contexts/ai-assistance/domain/ports/natural-language-parser.port.js";
import { ConfidenceScore } from "../../../../../src/contexts/ai-assistance/domain/value-objects/confidence-score.js";
import { SuggestionType } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-type.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { TransactionDate } from "../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../src/shared-kernel/domain/money.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { InMemorySuggestionRepository } from "../doubles/in-memory-suggestion.repository.js";

class StubNaturalLanguageParser implements NaturalLanguageParserPort {
  readonly contexts: FamilyContext[] = [];
  shouldReject = false;

  async parse(text: string, context: FamilyContext): Promise<ExpenseSuggestion> {
    this.contexts.push(context);
    if (this.shouldReject) throw new UnparseableTextError();

    return ExpenseSuggestionEntity.create({
      familyId: context.familyId,
      requestedBy: context.requestedBy,
      rawInput: text,
      suggestedType: SuggestionType.Expense,
      suggestedAmount: Money.of(25000, Currency.default()),
      suggestedCategoryId: null,
      suggestedTagId: null,
      suggestedDate: TransactionDate.of(new Date("2026-09-01T12:00:00.000Z")),
      confidence: ConfidenceScore.create(0.5),
    });
  }
}

describe("ParseNaturalLanguageExpenseUseCase", () => {
  test("genera, persiste y publica una sugerencia de texto", async () => {
    const parser = new StubNaturalLanguageParser();
    const repository = new InMemorySuggestionRepository();
    const eventBus = new FakeEventBus();
    const useCase = new ParseNaturalLanguageExpenseUseCase(parser, repository, eventBus);
    const familyId = FamilyId.generate();
    const requestedBy = UserId.generate();

    const suggestion = await useCase.execute({
      familyId,
      requestedBy,
      rawText: "Gasté $25.000 en bencina",
    });

    assert.equal(suggestion.familyId, familyId.toString());
    assert.equal(suggestion.requestedBy, requestedBy.toString());
    assert.equal(parser.contexts.length, 1);
    assert.deepEqual(parser.contexts[0], {
      familyId: familyId.toString(),
      requestedBy: requestedBy.toString(),
    });
    assert.equal(await repository.findById(suggestion.id), suggestion);
    assert.equal(eventBus.publishedEvents.length, 1);
    assert(eventBus.publishedEvents[0] instanceof SuggestionGenerated);
  });

  test("propaga el error cuando el texto no se puede interpretar", async () => {
    const parser = new StubNaturalLanguageParser();
    parser.shouldReject = true;
    const useCase = new ParseNaturalLanguageExpenseUseCase(
      parser,
      new InMemorySuggestionRepository(),
      new FakeEventBus(),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: FamilyId.generate(),
          requestedBy: UserId.generate(),
          rawText: "Texto sin monto",
        }),
      UnparseableTextError,
    );
  });
});
