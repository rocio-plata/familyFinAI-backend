// tests/integration/contexts/ai-assistance/infrastructure/persistence/ai-assistance.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { ExpenseSuggestion } from "../../../../../../src/contexts/ai-assistance/domain/entities/expense-suggestion.js";
import { MerchantCategoryHistory } from "../../../../../../src/contexts/ai-assistance/domain/entities/merchant-category-history.js";
import { ReceiptSuggestion } from "../../../../../../src/contexts/ai-assistance/domain/entities/receipt-suggestion.js";
import { ConfidenceScore } from "../../../../../../src/contexts/ai-assistance/domain/value-objects/confidence-score.js";
import { MerchantName } from "../../../../../../src/contexts/ai-assistance/domain/value-objects/merchant-name.js";
import { ReceiptImageRef } from "../../../../../../src/contexts/ai-assistance/domain/value-objects/receipt-image-ref.js";
import { SuggestionStatus } from "../../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-status.js";
import { SuggestionType } from "../../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-type.js";
import { DrizzleMerchantCategoryHistoryRepository } from "../../../../../../src/contexts/ai-assistance/infrastructure/persistence/drizzle-merchant-category-history.repository.js";
import { DrizzleSuggestionRepository } from "../../../../../../src/contexts/ai-assistance/infrastructure/persistence/drizzle-suggestion.repository.js";
import {
  merchantCategoryHistory,
  suggestions,
} from "../../../../../../src/contexts/ai-assistance/infrastructure/persistence/schema.js";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { TransactionDate } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { db } from "../../../../../../src/platform/db/connection.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../../src/shared-kernel/domain/money.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";
const repository = new DrizzleSuggestionRepository();
const historyRepository = new DrizzleMerchantCategoryHistoryRepository();
const suggestionIds: string[] = [];
const historyKeys: { familyId: string; merchantName: string }[] = [];

after(async () => {
  if (!hasDatabase) return;
  for (const id of suggestionIds) {
    await db.delete(suggestions).where(eq(suggestions.id, id));
  }
  for (const key of historyKeys) {
    await db
      .delete(merchantCategoryHistory)
      .where(
        and(
          eq(merchantCategoryHistory.familyId, key.familyId),
          eq(merchantCategoryHistory.merchantName, key.merchantName),
        ),
      );
  }
});

describe("Persistencia Drizzle de AI Assistance (integración)", () => {
  test("guarda y reconstituye una sugerencia de texto", { skip }, async () => {
    const suggestion = ExpenseSuggestion.create({
      familyId: FamilyId.generate().toString(),
      requestedBy: UserId.generate().toString(),
      rawInput: "Gasté $25.000 en bencina",
      suggestedType: SuggestionType.Expense,
      suggestedAmount: Money.of(25000, Currency.of("CLP")),
      suggestedCategoryId: "33333333-3333-4333-8333-333333333333",
      suggestedTagId: null,
      suggestedDate: TransactionDate.of(new Date("2026-09-01T12:00:00Z")),
      suggestedTitle: "Bencina",
      confidence: ConfidenceScore.create(0.5),
    });
    suggestionIds.push(suggestion.id.toString());
    await repository.save(suggestion);
    const found = await repository.findById(suggestion.id);

    assert.equal(found?.rawInput, suggestion.rawInput);
    assert.equal(found?.suggestedAmount.amount, 25000);
    assert.equal(found?.suggestedType, SuggestionType.Expense);
    assert.equal(found?.pullDomainEvents().length, 0);
  });

  test("guarda y reconstituye una sugerencia de recibo confirmada", { skip }, async () => {
    const suggestion = ReceiptSuggestion.fromScan({
      familyId: FamilyId.generate().toString(),
      requestedBy: UserId.generate().toString(),
      receiptImageRef: ReceiptImageRef.create("receipts/jumbo.jpg"),
      merchantName: MerchantName.create("Jumbo"),
      suggestedAmount: Money.of(18000, Currency.of("CLP")),
      suggestedCategoryId: null,
      suggestedTagId: null,
      suggestedDate: TransactionDate.of(new Date("2026-09-02T12:00:00Z")),
      confidence: ConfidenceScore.create(0.8),
    });
    suggestion.pullDomainEvents();
    suggestion.confirm({ categoryId: "33333333-3333-4333-8333-333333333333" });
    suggestionIds.push(suggestion.id.toString());
    await repository.save(suggestion);
    const found = await repository.findById(suggestion.id);

    assert.equal(found?.status, SuggestionStatus.Confirmed);
    assert.equal("merchantName" in (found ?? {}) ? found.merchantName.toString() : null, "Jumbo");
    assert.equal(found?.receiptImageRef.toString(), "receipts/jumbo.jpg");
  });

  test("hace upsert y recupera el historial por familia y comercio", { skip }, async () => {
    const familyId = FamilyId.generate().toString();
    const merchantName = MerchantName.create("Jumbo");
    const history = MerchantCategoryHistory.create({
      familyId,
      merchantName,
      categoryId: "33333333-3333-4333-8333-333333333333",
      tagId: null,
    });
    historyKeys.push({ familyId, merchantName: merchantName.toString() });
    await historyRepository.save(history);
    history.reinforce();
    await historyRepository.save(history);

    const found = await historyRepository.findByMerchant(familyId, merchantName);
    assert.equal(found?.timesUsed, 2);
    assert.equal(found?.categoryId, history.categoryId);
  });
});
