// tests/unit/contexts/ai-assistance/application/scan-receipt.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ScanReceiptUseCase } from "../../../../../src/contexts/ai-assistance/application/commands/scan-receipt.usecase.js";
import type {
  ReceiptImage,
  ReceiptScannerPort,
  ReceiptScanResult,
} from "../../../../../src/contexts/ai-assistance/domain/ports/receipt-scanner.port.js";
import type { FamilyContext } from "../../../../../src/contexts/ai-assistance/domain/ports/natural-language-parser.port.js";
import type { CategoryLookupPort } from "../../../../../src/contexts/ai-assistance/domain/ports/category-lookup.port.js";
import { MerchantCategoryHistory } from "../../../../../src/contexts/ai-assistance/domain/entities/merchant-category-history.js";
import { ReceiptSuggestion } from "../../../../../src/contexts/ai-assistance/domain/entities/receipt-suggestion.js";
import { UnreadableReceiptError } from "../../../../../src/contexts/ai-assistance/domain/errors/unreadable-receipt.error.js";
import { SuggestionGenerated } from "../../../../../src/contexts/ai-assistance/domain/events/suggestion-generated.event.js";
import { MerchantName } from "../../../../../src/contexts/ai-assistance/domain/value-objects/merchant-name.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { InMemoryMerchantCategoryHistoryRepository } from "../doubles/in-memory-merchant-category-history.repository.js";
import { InMemorySuggestionRepository } from "../doubles/in-memory-suggestion.repository.js";

const image: ReceiptImage = {
  reference: "receipts/jumbo-25000.jpg",
  contentType: "image/jpeg",
  sizeInBytes: 25000,
  merchantNameHint: "Jumbo",
  amountHint: 25000,
};

class StubReceiptScanner implements ReceiptScannerPort {
  calls = 0;
  result: ReceiptScanResult = {
    merchantName: "Jumbo",
    totalAmount: 25000,
    currency: "CLP",
    date: new Date("2026-09-01T12:00:00.000Z"),
    suggestedCategoryHint: "Supermercado",
  };

  async scan(_image: ReceiptImage, _context: FamilyContext): Promise<ReceiptScanResult> {
    this.calls += 1;
    return this.result;
  }
}

class StubCategoryLookup implements CategoryLookupPort {
  readonly hints: string[] = [];

  async findByNameHint(_familyId: string, nameHint: string): Promise<string | null> {
    this.hints.push(nameHint);
    return "33333333-3333-4333-8333-333333333333";
  }
}

describe("ScanReceiptUseCase", () => {
  test("escanea, resuelve la categoría, persiste y publica una sugerencia", async () => {
    const scanner = new StubReceiptScanner();
    const categoryLookup = new StubCategoryLookup();
    const eventBus = new FakeEventBus();
    const useCase = new ScanReceiptUseCase(
      scanner,
      new InMemoryMerchantCategoryHistoryRepository(),
      categoryLookup,
      new InMemorySuggestionRepository(),
      eventBus,
    );
    const familyId = FamilyId.generate();
    const requestedBy = UserId.generate();

    const suggestion = await useCase.execute({ familyId, requestedBy, image });

    assert.equal(scanner.calls, 1);
    assert.deepEqual(categoryLookup.hints, ["Supermercado"]);
    assert.equal(suggestion.merchantName.toString(), "Jumbo");
    assert.equal(suggestion.suggestedAmount.amount, 25000);
    assert.equal(suggestion.suggestedCategoryId, "33333333-3333-4333-8333-333333333333");
    assert(eventBus.publishedEvents[0] instanceof SuggestionGenerated);
  });

  test("usa el historial conocido sin llamar al scanner", async () => {
    const scanner = new StubReceiptScanner();
    const historyRepository = new InMemoryMerchantCategoryHistoryRepository();
    await historyRepository.save(
      MerchantCategoryHistory.create({
        familyId: "11111111-1111-4111-8111-111111111111",
        merchantName: MerchantName.create("Jumbo"),
        categoryId: "33333333-3333-4333-8333-333333333333",
        tagId: null,
      }),
    );
    const useCase = new ScanReceiptUseCase(
      scanner,
      historyRepository,
      new StubCategoryLookup(),
      new InMemorySuggestionRepository(),
      new FakeEventBus(),
    );

    const suggestion = await useCase.execute({
      familyId: FamilyId.of("11111111-1111-4111-8111-111111111111"),
      requestedBy: UserId.generate(),
      image,
    });

    assert.equal(scanner.calls, 0);
    assert.equal(suggestion.suggestedCategoryId, "33333333-3333-4333-8333-333333333333");
  });

  test("rechaza un resultado sin monto", async () => {
    const scanner = new StubReceiptScanner();
    scanner.result = { ...scanner.result, totalAmount: 0 };
    const useCase = new ScanReceiptUseCase(
      scanner,
      new InMemoryMerchantCategoryHistoryRepository(),
      new StubCategoryLookup(),
      new InMemorySuggestionRepository(),
      new FakeEventBus(),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: FamilyId.generate(),
          requestedBy: UserId.generate(),
          image: { ...image, merchantNameHint: undefined },
        }),
      UnreadableReceiptError,
    );
  });
});