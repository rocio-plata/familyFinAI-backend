// tests/unit/contexts/ai-assistance/infrastructure/ai-assistance.routes.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import Fastify from "fastify";
import type { ConfirmedSuggestionCommand } from "../../../../../src/contexts/ai-assistance/application/commands/confirm-suggestion.usecase.js";
import { ConfirmSuggestionUseCase } from "../../../../../src/contexts/ai-assistance/application/commands/confirm-suggestion.usecase.js";
import { DiscardSuggestionUseCase } from "../../../../../src/contexts/ai-assistance/application/commands/discard-suggestion.usecase.js";
import { ParseNaturalLanguageExpenseUseCase } from "../../../../../src/contexts/ai-assistance/application/commands/parse-natural-language-expense.usecase.js";
import { ScanReceiptUseCase } from "../../../../../src/contexts/ai-assistance/application/commands/scan-receipt.usecase.js";
import { registerAiAssistanceRoutes } from "../../../../../src/contexts/ai-assistance/infrastructure/http/ai-assistance.routes.js";
import { FakeNaturalLanguageParser } from "../../../../../src/contexts/ai-assistance/infrastructure/providers/fake-natural-language-parser.adapter.js";
import { FakeReceiptScanner } from "../../../../../src/contexts/ai-assistance/infrastructure/providers/fake-receipt-scanner.adapter.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { registerErrorHandler } from "../../../../../src/platform/http/error-handler.js";
import { FakeEventBus } from "../../../shared/doubles/fake-event-bus.js";
import { InMemoryMerchantCategoryHistoryRepository } from "../doubles/in-memory-merchant-category-history.repository.js";
import { InMemorySuggestionRepository } from "../doubles/in-memory-suggestion.repository.js";

const familyId = FamilyId.generate();
const userId = UserId.generate();
const categoryId = "33333333-3333-4333-8333-333333333333";

async function createApp() {
  const suggestionRepository = new InMemorySuggestionRepository();
  const historyRepository = new InMemoryMerchantCategoryHistoryRepository();
  const eventBus = new FakeEventBus();
  const categoryLookup = { findByNameHint: async () => categoryId };
  const createFinancialItem = {
    execute: async (input: ConfirmedSuggestionCommand) => ({
      id: { toString: () => "44444444-4444-4444-8444-444444444444" },
      type: "EXPENSE",
      amount: input.amount,
      categoryAssignment: {
        categoryId: input.categoryId,
        tagId: input.tagId,
      },
      paymentMethodId: undefined,
      title: input.title,
      note: null,
      occurredOn: input.occurredOn,
      createdAt: new Date("2026-10-17T00:00:00.000Z"),
    }),
  };
  const app = Fastify({ logger: false });
  registerErrorHandler(app);

  await registerAiAssistanceRoutes(app, {
    authenticate: async (request) => {
      request.userId = userId;
    },
    requireFamilyMembership: () => async () => undefined,
    parseNaturalLanguageExpenseUseCase: new ParseNaturalLanguageExpenseUseCase(
      new FakeNaturalLanguageParser(),
      suggestionRepository,
      eventBus,
    ),
    scanReceiptUseCase: new ScanReceiptUseCase(
      new FakeReceiptScanner(),
      historyRepository,
      categoryLookup,
      suggestionRepository,
      eventBus,
    ),
    confirmSuggestionUseCase: new ConfirmSuggestionUseCase(
      suggestionRepository,
      createFinancialItem,
      historyRepository,
      eventBus,
    ),
    discardSuggestionUseCase: new DiscardSuggestionUseCase(suggestionRepository, eventBus),
  });
  await app.ready();
  return { app, suggestionRepository, historyRepository };
}

describe("AI Assistance HTTP routes", () => {
  test("crea una sugerencia desde texto y exige autenticación", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/suggestions/text`,
      payload: { rawText: "Gasté $25.000 en bencina" },
    });
    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json().amount, { amount: 25000, currency: "CLP" });

    const unauthorizedApp = Fastify({ logger: false });
    registerErrorHandler(unauthorizedApp);
    await registerAiAssistanceRoutes(unauthorizedApp, {
      ...(await createAppDependencies()),
      authenticate: async (_request, reply) => reply.code(401).send({ error: "Missing token" }),
    });
    await unauthorizedApp.ready();
    const unauthorized = await unauthorizedApp.inject({
      method: "POST",
      url: `/families/${familyId}/suggestions/text`,
      payload: { rawText: "Gasté $25.000" },
    });
    assert.equal(unauthorized.statusCode, 401);
    await app.close();
    await unauthorizedApp.close();
  });

  test("acepta un recibo multipart", async () => {
    const { app } = await createApp();
    const boundary = "ai-assistance-boundary";
    const multipartPrefix = `${[
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="jumbo-25000.jpg"',
      "Content-Type: image/jpeg",
      "",
    ].join("\r\n")}\r\n`;
    const payload = Buffer.concat([
      Buffer.from(multipartPrefix),
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/suggestions/receipt`,
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    assert.equal(response.statusCode, 201);
    assert.equal(response.json().source, "RECEIPT");
    await app.close();
  });

  test("confirma y descarta sugerencias mediante sus endpoints", async () => {
    const { app } = await createApp();
    const created = await app.inject({
      method: "POST",
      url: `/families/${familyId}/suggestions/text`,
      payload: { rawText: "Gasté $25.000" },
    });
    const suggestionId = created.json().id;

    const confirmed = await app.inject({
      method: "POST",
      url: `/families/${familyId}/suggestions/${suggestionId}/confirm`,
      payload: { categoryId, title: "Bencina" },
    });
    assert.equal(confirmed.statusCode, 201);

    const discarded = await app.inject({
      method: "POST",
      url: `/families/${familyId}/suggestions/text`,
      payload: { rawText: "Gasté $1.000" },
    });
    const discardedResponse = await app.inject({
      method: "DELETE",
      url: `/families/${familyId}/suggestions/${discarded.json().id}`,
    });
    assert.equal(discardedResponse.statusCode, 204);
    await app.close();
  });

  test("rechaza un body de texto inválido", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/suggestions/text`,
      payload: {},
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, "HTTP.INVALID_REQUEST_BODY");
    await app.close();
  });
});

async function createAppDependencies() {
  const suggestionRepository = new InMemorySuggestionRepository();
  const historyRepository = new InMemoryMerchantCategoryHistoryRepository();
  const eventBus = new FakeEventBus();
  return {
    requireFamilyMembership: () => async () => undefined,
    parseNaturalLanguageExpenseUseCase: new ParseNaturalLanguageExpenseUseCase(
      new FakeNaturalLanguageParser(),
      suggestionRepository,
      eventBus,
    ),
    scanReceiptUseCase: new ScanReceiptUseCase(
      new FakeReceiptScanner(),
      historyRepository,
      { findByNameHint: async () => categoryId },
      suggestionRepository,
      eventBus,
    ),
    confirmSuggestionUseCase: new ConfirmSuggestionUseCase(
      suggestionRepository,
      { execute: async () => undefined },
      historyRepository,
      eventBus,
    ),
    discardSuggestionUseCase: new DiscardSuggestionUseCase(suggestionRepository, eventBus),
  };
}
