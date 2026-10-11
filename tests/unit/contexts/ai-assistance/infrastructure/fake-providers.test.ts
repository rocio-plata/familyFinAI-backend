// tests/unit/contexts/ai-assistance/infrastructure/fake-providers.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { UnparseableTextError } from "../../../../../src/contexts/ai-assistance/domain/errors/unparseable-text.error.js";
import { SuggestionGenerated } from "../../../../../src/contexts/ai-assistance/domain/events/suggestion-generated.event.js";
import { SuggestionStatus } from "../../../../../src/contexts/ai-assistance/domain/value-objects/suggestion-status.js";
import { FakeNaturalLanguageParser } from "../../../../../src/contexts/ai-assistance/infrastructure/providers/fake-natural-language-parser.adapter.js";
import { FakeReceiptScanner } from "../../../../../src/contexts/ai-assistance/infrastructure/providers/fake-receipt-scanner.adapter.js";

const context = {
  familyId: "11111111-1111-4111-8111-111111111111",
  requestedBy: "22222222-2222-4222-8222-222222222222",
};

describe("FakeNaturalLanguageParser", () => {
  test("extrae un monto en formato chileno y crea una sugerencia pendiente", async () => {
    const parser = new FakeNaturalLanguageParser();

    const suggestion = await parser.parse("Gasté $25.000 en bencina", context);

    assert.equal(suggestion.suggestedAmount.amount, 25000);
    assert.equal(suggestion.suggestedAmount.currency.toString(), "CLP");
    assert.equal(suggestion.suggestedCategoryId, null);
    assert.equal(suggestion.status, SuggestionStatus.Pending);
    assert(suggestion.pullDomainEvents()[0] instanceof SuggestionGenerated);
  });

  test("rechaza texto sin un monto reconocible", async () => {
    const parser = new FakeNaturalLanguageParser();

    await assert.rejects(
      () => parser.parse("Hoy fui al supermercado", context),
      UnparseableTextError,
    );
  });
});

describe("FakeReceiptScanner", () => {
  test("devuelve un resultado neutral determinista desde los metadatos de la imagen", async () => {
    const scanner = new FakeReceiptScanner();

    const result = await scanner.scan(
      {
        reference: "receipts/jumbo-25000.jpg",
        contentType: "image/jpeg",
        sizeInBytes: 25000,
      },
      context,
    );

    assert.equal(result.merchantName, "Jumbo");
    assert.equal(result.totalAmount, 25000);
    assert.equal(result.currency, "CLP");
    assert(result.date instanceof Date);
    assert.equal(result.suggestedCategoryHint, null);
  });

  test("usa valores seguros cuando la referencia no contiene un nombre de comercio", async () => {
    const scanner = new FakeReceiptScanner();

    const result = await scanner.scan(
      {
        reference: "receipt.jpg",
        contentType: "image/jpeg",
        sizeInBytes: 0,
      },
      context,
    );

    assert.equal(result.merchantName, "Comercio desconocido");
    assert.equal(result.totalAmount, 1);
    assert.equal(result.currency, "CLP");
    assert.equal(result.date, null);
  });
});
