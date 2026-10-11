// tests/unit/contexts/ai-assistance/application/discard-suggestion.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DiscardSuggestionUseCase } from "../../../../../src/contexts/ai-assistance/application/commands/discard-suggestion.usecase.js";
import { ExpenseSuggestion } from "../../../../../src/contexts/ai-assistance/domain/entities/expense-suggestion.js";
import { SuggestionNotFoundError } from "../../../../../src/contexts/ai-assistance/domain/errors/suggestion-not-found.error.js";
import { SuggestionNotPendingError } from "../../../../../src/contexts/ai-assistance/domain/errors/suggestion-not-pending.error.js";
import { SuggestionDiscarded } from "../../../../../src/contexts/ai-assistance/domain/events/suggestion-discarded.event.js";
import { ConfidenceScore } from "../../../../../src/contexts/ai-assistance/domain/value-objects/confidence-score.js";
import { SuggestionId } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-id.js";
import { SuggestionType } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-type.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { TransactionDate } from "../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../src/shared-kernel/domain/money.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { InMemorySuggestionRepository } from "../doubles/in-memory-suggestion.repository.js";

function createSuggestion(familyId: FamilyId, requestedBy: UserId): ExpenseSuggestion {
  const suggestion = ExpenseSuggestion.create({
    familyId: familyId.toString(),
    requestedBy: requestedBy.toString(),
    rawInput: "Gasté $25.000 en bencina",
    suggestedType: SuggestionType.Expense,
    suggestedAmount: Money.of(25000, Currency.default()),
    suggestedCategoryId: null,
    suggestedTagId: null,
    suggestedDate: TransactionDate.of(new Date("2026-09-01T12:00:00.000Z")),
    confidence: ConfidenceScore.create(0.5),
  });
  suggestion.pullDomainEvents();
  return suggestion;
}

describe("DiscardSuggestionUseCase", () => {
  test("descarta y persiste una sugerencia pendiente", async () => {
    const familyId = FamilyId.generate();
    const suggestion = createSuggestion(familyId, UserId.generate());
    const repository = new InMemorySuggestionRepository();
    await repository.save(suggestion);
    const eventBus = new FakeEventBus();
    const useCase = new DiscardSuggestionUseCase(repository, eventBus);

    await useCase.execute({ familyId, suggestionId: suggestion.id });

    const persisted = await repository.findById(suggestion.id);
    assert.equal(persisted?.status, "DISCARDED");
    assert(eventBus.publishedEvents[0] instanceof SuggestionDiscarded);
  });

  test("rechaza una sugerencia inexistente o de otra familia", async () => {
    const useCase = new DiscardSuggestionUseCase(
      new InMemorySuggestionRepository(),
      new FakeEventBus(),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: FamilyId.generate(),
          suggestionId: SuggestionId.generate(),
        }),
      SuggestionNotFoundError,
    );
  });

  test("rechaza descartar una sugerencia que ya no está pendiente", async () => {
    const familyId = FamilyId.generate();
    const suggestion = createSuggestion(familyId, UserId.generate());
    suggestion.discard();
    const repository = new InMemorySuggestionRepository();
    await repository.save(suggestion);
    const useCase = new DiscardSuggestionUseCase(repository, new FakeEventBus());

    await assert.rejects(
      () => useCase.execute({ familyId, suggestionId: suggestion.id }),
      SuggestionNotPendingError,
    );
  });
});
