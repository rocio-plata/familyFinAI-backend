// tests/unit/contexts/ai-assistance/domain/suggestion-domain.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ConfirmedSuggestion } from "../../../../../src/contexts/ai-assistance/domain/entities/confirmed-suggestion.js";
import { ExpenseSuggestion } from "../../../../../src/contexts/ai-assistance/domain/entities/expense-suggestion.js";
import { MerchantCategoryHistory } from "../../../../../src/contexts/ai-assistance/domain/entities/merchant-category-history.js";
import { ReceiptSuggestion } from "../../../../../src/contexts/ai-assistance/domain/entities/receipt-suggestion.js";
import { AIProviderUnavailableError } from "../../../../../src/contexts/ai-assistance/domain/errors/ai-provider-unavailable.error.js";
import { SuggestionNotPendingError } from "../../../../../src/contexts/ai-assistance/domain/errors/suggestion-not-pending.error.js";
import { UnparseableTextError } from "../../../../../src/contexts/ai-assistance/domain/errors/unparseable-text.error.js";
import { SuggestionConfirmed } from "../../../../../src/contexts/ai-assistance/domain/events/suggestion-confirmed.event.js";
import { SuggestionDiscarded } from "../../../../../src/contexts/ai-assistance/domain/events/suggestion-discarded.event.js";
import { SuggestionGenerated } from "../../../../../src/contexts/ai-assistance/domain/events/suggestion-generated.event.js";
import { ConfidenceScore } from "../../../../../src/contexts/ai-assistance/domain/value-objects/confidence-score.js";
import { MerchantName } from "../../../../../src/contexts/ai-assistance/domain/value-objects/merchant-name.js";
import { ReceiptImageRef } from "../../../../../src/contexts/ai-assistance/domain/value-objects/receipt-image-ref.js";
import { SuggestionId } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-id.js";
import { SuggestionStatus } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-status.js";
import { SuggestionType } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-type.js";
import { TransactionDate } from "../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../src/shared-kernel/domain/money.js";

const familyId = "11111111-1111-4111-8111-111111111111";
const requestedBy = "22222222-2222-4222-8222-222222222222";
const occurredOn = TransactionDate.of(new Date("2026-09-01T12:00:00.000Z"));
const amount = Money.of(25000, Currency.of("CLP"));

describe("value objects de AI Assistance", () => {
  test("valida y normaliza un nombre de comercio", () => {
    const merchant = MerchantName.create("  Supermercado   Central ");

    assert.equal(merchant.toString(), "Supermercado Central");
    assert(merchant.equals(MerchantName.create("Supermercado Central")));
  });

  test("valida el rango de confianza entre cero y uno", () => {
    assert.equal(ConfidenceScore.create(0.75).value, 0.75);
    assert.throws(() => ConfidenceScore.create(-0.01));
    assert.throws(() => ConfidenceScore.create(1.01));
  });

  test("valida una referencia de imagen de recibo no vacía", () => {
    const imageRef = ReceiptImageRef.create("receipts/2026/09/receipt.jpg");

    assert.equal(imageRef.toString(), "receipts/2026/09/receipt.jpg");
    assert.throws(() => ReceiptImageRef.create("   "));
  });
});

describe("ExpenseSuggestion", () => {
  test("crea una sugerencia pendiente y registra SuggestionGenerated", () => {
    const suggestion = ExpenseSuggestion.create({
      familyId,
      requestedBy,
      rawInput: "Gasté $25.000 en supermercado ayer",
      suggestedType: SuggestionType.Expense,
      suggestedAmount: amount,
      suggestedCategoryId: "33333333-3333-4333-8333-333333333333",
      suggestedTagId: null,
      suggestedDate: occurredOn,
      confidence: ConfidenceScore.create(0.91),
    });

    assert.equal(suggestion.status, SuggestionStatus.Pending);
    assert.equal(suggestion.rawInput, "Gasté $25.000 en supermercado ayer");
    assert.ok(suggestion.id);
    const events = suggestion.pullDomainEvents();
    assert.equal(events.length, 1);
    assert(events[0] instanceof SuggestionGenerated);
  });

  test("confirma una sugerencia aplicando las ediciones del usuario", () => {
    const suggestion = ExpenseSuggestion.create({
      familyId,
      requestedBy,
      rawInput: "Gasté $25.000 en supermercado ayer",
      suggestedType: SuggestionType.Expense,
      suggestedAmount: amount,
      suggestedCategoryId: null,
      suggestedTagId: null,
      suggestedDate: occurredOn,
      confidence: ConfidenceScore.create(0.8),
    });
    suggestion.pullDomainEvents();

    const confirmed = suggestion.confirm({
      amount: Money.of(26000, Currency.of("CLP")),
      categoryId: "33333333-3333-4333-8333-333333333333",
    });

    assert.equal(suggestion.status, SuggestionStatus.Confirmed);
    assert.equal(confirmed.amount.amount, 26000);
    assert.equal(confirmed.categoryId, "33333333-3333-4333-8333-333333333333");
    assert(suggestion.pullDomainEvents()[0] instanceof SuggestionConfirmed);
  });

  test("descarta una sugerencia pendiente", () => {
    const suggestion = ExpenseSuggestion.create({
      familyId,
      requestedBy,
      rawInput: "Gasté $25.000 en supermercado ayer",
      suggestedType: SuggestionType.Expense,
      suggestedAmount: amount,
      suggestedCategoryId: null,
      suggestedTagId: null,
      suggestedDate: occurredOn,
      confidence: ConfidenceScore.create(0.8),
    });
    suggestion.pullDomainEvents();

    suggestion.discard();

    assert.equal(suggestion.status, SuggestionStatus.Discarded);
    assert(suggestion.pullDomainEvents()[0] instanceof SuggestionDiscarded);
  });

  test("no permite confirmar ni descartar una sugerencia dos veces", () => {
    const suggestion = ExpenseSuggestion.create({
      familyId,
      requestedBy,
      rawInput: "Gasté $25.000 en supermercado ayer",
      suggestedType: SuggestionType.Expense,
      suggestedAmount: amount,
      suggestedCategoryId: null,
      suggestedTagId: null,
      suggestedDate: occurredOn,
      confidence: ConfidenceScore.create(0.8),
    });
    suggestion.pullDomainEvents();
    suggestion.discard();

    assert.throws(() => suggestion.discard(), SuggestionNotPendingError);
    assert.throws(() => suggestion.confirm({}), SuggestionNotPendingError);
  });

  test("reconstituye una sugerencia sin generar eventos", () => {
    const suggestion = ExpenseSuggestion.reconstitute({
      id: "44444444-4444-4444-8444-444444444444",
      familyId,
      requestedBy,
      rawInput: "Sueldo",
      suggestedType: SuggestionType.Income,
      suggestedAmount: 1000000,
      currency: "CLP",
      suggestedCategoryId: null,
      suggestedTagId: null,
      suggestedDate: new Date("2026-09-01T12:00:00.000Z"),
      suggestedTitle: "Sueldo",
      confidence: 1,
      status: SuggestionStatus.Pending,
    });

    assert.equal(suggestion.id.toString(), "44444444-4444-4444-8444-444444444444");
    assert.equal(suggestion.suggestedAmount.amount, 1000000);
    assert.equal(suggestion.pullDomainEvents().length, 0);
  });

  test("reconstituye una sugerencia confirmada desde sus datos de dominio", () => {
    const confirmed = ConfirmedSuggestion.reconstitute({
      id: SuggestionId.of("55555555-5555-4555-8555-555555555555"),
      familyId,
      requestedBy,
      type: SuggestionType.Expense,
      amount,
      categoryId: null,
      tagId: null,
      occurredOn,
      title: "Supermercado",
      source: "TEXT",
      merchantName: null,
    });

    assert.equal(confirmed.id.toString(), "55555555-5555-4555-8555-555555555555");
    assert.equal(confirmed.title, "Supermercado");
  });

  test("rechaza texto libre vacio", () => {
    assert.throws(
      () =>
        ExpenseSuggestion.create({
          familyId,
          requestedBy,
          rawInput: "   ",
          suggestedType: SuggestionType.Expense,
          suggestedAmount: amount,
          suggestedCategoryId: null,
          suggestedTagId: null,
          suggestedDate: occurredOn,
          confidence: ConfidenceScore.create(0.8),
        }),
      UnparseableTextError,
    );
  });
});

describe("ReceiptSuggestion", () => {
  test("crea exactamente una sugerencia por recibo y conserva su comercio", () => {
    const suggestion = ReceiptSuggestion.fromScan({
      familyId,
      requestedBy,
      receiptImageRef: ReceiptImageRef.create("receipts/receipt.jpg"),
      merchantName: MerchantName.create("Supermercado Central"),
      suggestedAmount: amount,
      suggestedCategoryId: null,
      suggestedTagId: null,
      suggestedDate: occurredOn,
      confidence: ConfidenceScore.create(0.86),
    });

    assert.equal(suggestion.status, SuggestionStatus.Pending);
    assert.equal(suggestion.merchantName.toString(), "Supermercado Central");
    assert.equal(suggestion.pullDomainEvents().length, 1);
  });
});

describe("MerchantCategoryHistory", () => {
  test("crea y refuerza una asociación de comercio y categoría", () => {
    const history = MerchantCategoryHistory.create({
      familyId,
      merchantName: MerchantName.create("Supermercado Central"),
      categoryId: "33333333-3333-4333-8333-333333333333",
      tagId: null,
    });

    history.reinforce();

    assert.equal(history.timesUsed, 2);
    assert.equal(history.merchantName.toString(), "Supermercado Central");
  });
});

test("AIProviderUnavailableError es un error de dominio", () => {
  assert.throws(() => {
    throw new AIProviderUnavailableError();
  }, AIProviderUnavailableError);
});

test("SuggestionId rechaza valores que no son UUID", () => {
  assert.throws(() => SuggestionId.of("no-es-un-uuid"));
});
