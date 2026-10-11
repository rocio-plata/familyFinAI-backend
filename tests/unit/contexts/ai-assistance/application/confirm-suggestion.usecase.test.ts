// tests/unit/contexts/ai-assistance/application/confirm-suggestion.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ConfirmedSuggestionCommand } from "../../../../../src/contexts/ai-assistance/application/commands/confirm-suggestion.usecase.js";
import { ConfirmSuggestionUseCase } from "../../../../../src/contexts/ai-assistance/application/commands/confirm-suggestion.usecase.js";
import { ExpenseSuggestion } from "../../../../../src/contexts/ai-assistance/domain/entities/expense-suggestion.js";
import { MerchantCategoryHistory } from "../../../../../src/contexts/ai-assistance/domain/entities/merchant-category-history.js";
import { ReceiptSuggestion } from "../../../../../src/contexts/ai-assistance/domain/entities/receipt-suggestion.js";
import { SuggestionNotFoundError } from "../../../../../src/contexts/ai-assistance/domain/errors/suggestion-not-found.error.js";
import { SuggestionNotPendingError } from "../../../../../src/contexts/ai-assistance/domain/errors/suggestion-not-pending.error.js";
import { MerchantCategoryLearned } from "../../../../../src/contexts/ai-assistance/domain/events/merchant-category-learned.event.js";
import { SuggestionConfirmed } from "../../../../../src/contexts/ai-assistance/domain/events/suggestion-confirmed.event.js";
import { ConfidenceScore } from "../../../../../src/contexts/ai-assistance/domain/value-objects/confidence-score.js";
import { MerchantName } from "../../../../../src/contexts/ai-assistance/domain/value-objects/merchant-name.js";
import { ReceiptImageRef } from "../../../../../src/contexts/ai-assistance/domain/value-objects/receipt-image-ref.js";
import { SuggestionId } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-id.js";
import { SuggestionType } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-type.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { TransactionDate } from "../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../src/shared-kernel/domain/money.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { InMemoryMerchantCategoryHistoryRepository } from "../doubles/in-memory-merchant-category-history.repository.js";
import { InMemorySuggestionRepository } from "../doubles/in-memory-suggestion.repository.js";

const categoryId = "33333333-3333-4333-8333-333333333333";
const tagId = "44444444-4444-4444-8444-444444444444";

class FakeCreateFinancialItemUseCase {
  readonly commands: ConfirmedSuggestionCommand[] = [];

  async execute(command: ConfirmedSuggestionCommand): Promise<void> {
    this.commands.push(command);
  }
}

function createExpenseSuggestion(familyId: FamilyId, requestedBy: UserId): ExpenseSuggestion {
  const suggestion = ExpenseSuggestion.create({
    familyId: familyId.toString(),
    requestedBy: requestedBy.toString(),
    rawInput: "Gasté $25.000 en bencina",
    suggestedType: SuggestionType.Expense,
    suggestedAmount: Money.of(25000, Currency.default()),
    suggestedCategoryId: categoryId,
    suggestedTagId: null,
    suggestedDate: TransactionDate.of(new Date("2026-09-01T12:00:00.000Z")),
    confidence: ConfidenceScore.create(0.5),
    suggestedTitle: "Bencina",
  });
  suggestion.pullDomainEvents();
  return suggestion;
}

function createReceiptSuggestion(familyId: FamilyId, requestedBy: UserId): ReceiptSuggestion {
  const suggestion = ReceiptSuggestion.fromScan({
    familyId: familyId.toString(),
    requestedBy: requestedBy.toString(),
    receiptImageRef: ReceiptImageRef.create("receipts/jumbo-25000.jpg"),
    merchantName: MerchantName.create("Jumbo"),
    suggestedAmount: Money.of(25000, Currency.default()),
    suggestedCategoryId: categoryId,
    suggestedTagId: null,
    suggestedDate: TransactionDate.of(new Date("2026-09-01T12:00:00.000Z")),
    confidence: ConfidenceScore.create(0.5),
    suggestedTitle: "Jumbo",
  });
  suggestion.pullDomainEvents();
  return suggestion;
}

describe("ConfirmSuggestionUseCase", () => {
  test("confirma una sugerencia de texto llamando al caso de uso financiero", async () => {
    const familyId = FamilyId.generate();
    const requestedBy = UserId.generate();
    const suggestion = createExpenseSuggestion(familyId, requestedBy);
    const repository = new InMemorySuggestionRepository();
    await repository.save(suggestion);
    const createFinancialItem = new FakeCreateFinancialItemUseCase();
    const eventBus = new FakeEventBus();
    const useCase = new ConfirmSuggestionUseCase(
      repository,
      createFinancialItem,
      new InMemoryMerchantCategoryHistoryRepository(),
      eventBus,
    );

    await useCase.execute({
      familyId,
      requestedBy,
      suggestionId: suggestion.id,
      edits: { categoryId, tagId, title: "Bencina" },
    });

    assert.equal(createFinancialItem.commands.length, 1);
    assert.equal(createFinancialItem.commands[0]?.familyId.toString(), familyId.toString());
    assert.equal(createFinancialItem.commands[0]?.recordedBy.toString(), requestedBy.toString());
    assert.equal(createFinancialItem.commands[0]?.categoryId.toString(), categoryId);
    assert.equal(createFinancialItem.commands[0]?.tagId?.toString(), tagId);
    assert.equal(createFinancialItem.commands[0]?.title.toString(), "Bencina");
    assert(eventBus.publishedEvents[0] instanceof SuggestionConfirmed);
  });

  test("aprende la categoría de un recibo y publica MerchantCategoryLearned", async () => {
    const familyId = FamilyId.generate();
    const requestedBy = UserId.generate();
    const suggestion = createReceiptSuggestion(familyId, requestedBy);
    const repository = new InMemorySuggestionRepository();
    await repository.save(suggestion);
    const historyRepository = new InMemoryMerchantCategoryHistoryRepository();
    const eventBus = new FakeEventBus();
    const useCase = new ConfirmSuggestionUseCase(
      repository,
      new FakeCreateFinancialItemUseCase(),
      historyRepository,
      eventBus,
    );

    await useCase.execute({
      familyId,
      requestedBy,
      suggestionId: suggestion.id,
      edits: { categoryId, title: "Jumbo" },
    });

    const history = await historyRepository.findByMerchant(
      familyId.toString(),
      MerchantName.create("Jumbo"),
    );
    assert.equal(history?.categoryId, categoryId);
    assert(eventBus.publishedEvents.some((event) => event instanceof MerchantCategoryLearned));
  });

  test("refuerza el historial existente de un recibo", async () => {
    const familyId = FamilyId.generate();
    const requestedBy = UserId.generate();
    const suggestion = createReceiptSuggestion(familyId, requestedBy);
    const repository = new InMemorySuggestionRepository();
    await repository.save(suggestion);
    const historyRepository = new InMemoryMerchantCategoryHistoryRepository();
    await historyRepository.save(
      MerchantCategoryHistory.create({
        familyId: familyId.toString(),
        merchantName: MerchantName.create("Jumbo"),
        categoryId,
        tagId: null,
      }),
    );
    const useCase = new ConfirmSuggestionUseCase(
      repository,
      new FakeCreateFinancialItemUseCase(),
      historyRepository,
      new FakeEventBus(),
    );

    await useCase.execute({
      familyId,
      requestedBy,
      suggestionId: suggestion.id,
      edits: { categoryId, title: "Jumbo" },
    });

    const history = await historyRepository.findByMerchant(
      familyId.toString(),
      MerchantName.create("Jumbo"),
    );
    assert.equal(history?.timesUsed, 2);
  });

  test("rechaza una sugerencia inexistente o ya no pendiente", async () => {
    const repository = new InMemorySuggestionRepository();
    const useCase = new ConfirmSuggestionUseCase(
      repository,
      new FakeCreateFinancialItemUseCase(),
      new InMemoryMerchantCategoryHistoryRepository(),
      new FakeEventBus(),
    );
    const familyId = FamilyId.generate();
    const requestedBy = UserId.generate();

    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy,
          suggestionId: SuggestionId.generate(),
          edits: { categoryId, title: "Bencina" },
        }),
      SuggestionNotFoundError,
    );

    const suggestion = createExpenseSuggestion(familyId, requestedBy);
    await repository.save(suggestion);
    suggestion.discard();
    await assert.rejects(
      () =>
        useCase.execute({
          familyId,
          requestedBy,
          suggestionId: suggestion.id,
          edits: { categoryId, title: "Bencina" },
        }),
      SuggestionNotPendingError,
    );
  });
});
