// src/contexts/ai-assistance/infrastructure/http/ai-assistance.routes.ts
import multipart from "@fastify/multipart";
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { toMoneyDto } from "../../../../platform/http/money.dto.js";
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { Role } from "../../../family-access/domain/value-objects/role.js";
import { TransactionDate } from "../../../financial-tracking/domain/value-objects/transaction-date.js";
import type { ConfirmSuggestionUseCase } from "../../application/commands/confirm-suggestion.usecase.js";
import type { DiscardSuggestionUseCase } from "../../application/commands/discard-suggestion.usecase.js";
import type { ParseNaturalLanguageExpenseUseCase } from "../../application/commands/parse-natural-language-expense.usecase.js";
import type { ScanReceiptUseCase } from "../../application/commands/scan-receipt.usecase.js";
import type { GetPendingSuggestionsQuery } from "../../application/queries/get-pending-suggestions.query.js";
import type { AiUsagePolicy } from "../../application/services/ai-usage-policy.js";
import { SuggestionId } from "../../domain/value-objects/suggestion-id.js";

interface AiAssistanceRoutesDependencies {
  authenticate: preHandlerHookHandler;
  requireFamilyMembership: (minRole?: Role) => preHandlerHookHandler;
  parseNaturalLanguageExpenseUseCase: ParseNaturalLanguageExpenseUseCase;
  scanReceiptUseCase: ScanReceiptUseCase;
  confirmSuggestionUseCase: ConfirmSuggestionUseCase;
  discardSuggestionUseCase: DiscardSuggestionUseCase;
  getPendingSuggestionsQuery: GetPendingSuggestionsQuery;
  aiUsagePolicy: AiUsagePolicy | undefined;
}

const familyParams = {
  type: "object",
  required: ["familyId"],
  properties: { familyId: { type: "string", minLength: 1 } },
};
const suggestionParams = {
  type: "object",
  required: ["familyId", "suggestionId"],
  properties: {
    familyId: { type: "string", minLength: 1 },
    suggestionId: { type: "string", minLength: 1 },
  },
};

async function registerAiAssistanceRoutes(
  app: FastifyInstance,
  deps: AiAssistanceRoutesDependencies,
): Promise<void> {
  await app.register(multipart, { limits: { files: 1, fileSize: 10 * 1024 * 1024 } });

  const preHandler = [deps.authenticate, deps.requireFamilyMembership()];

  app.get(
    "/families/:familyId/ai-usage",
    { preHandler, schema: { params: familyParams } },
    async (request, reply) => {
      const status = deps.aiUsagePolicy
        ? await deps.aiUsagePolicy.status(request.userId.toString())
        : { limit: 0, used: 0, remaining: 0, resetsAt: new Date().toISOString() };
      return reply.code(200).send(status);
    },
  );

  app.get(
    "/families/:familyId/suggestions",
    { preHandler, schema: { params: familyParams } },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const suggestions = await deps.getPendingSuggestionsQuery.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
      });
      return reply.code(200).send(suggestions.map(serializeSuggestion));
    },
  );

  app.post(
    "/families/:familyId/suggestions/text",
    {
      preHandler,
      schema: {
        params: familyParams,
        body: {
          type: "object",
          required: ["rawText"],
          properties: { rawText: { type: "string", minLength: 1, maxLength: 500 } },
        },
      },
    },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const { rawText } = request.body as { rawText: string };
      const suggestion = await deps.parseNaturalLanguageExpenseUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        rawText,
      });
      return reply.code(201).send(serializeSuggestion(suggestion));
    },
  );

  app.post(
    "/families/:familyId/suggestions/receipt",
    { preHandler, schema: { params: familyParams } },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const file = await request.file();
      if (!file) {
        return reply.code(400).send({
          error: "HTTP.INVALID_REQUEST_BODY",
          message: "Se requiere una imagen de recibo",
        });
      }
      if (file.fieldname !== "file") {
        return reply.code(400).send({
          error: "HTTP.INVALID_REQUEST_BODY",
          message: "El campo del archivo debe llamarse file",
        });
      }
      const buffer = await file.toBuffer();
      if (!isSupportedImage(file.mimetype, buffer)) {
        return reply.code(400).send({
          error: "AI.UNSUPPORTED_IMAGE_TYPE",
          message: "Formato de imagen no admitido. Usa JPEG, PNG o WebP",
        });
      }
      const suggestion = await deps.scanReceiptUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        image: {
          reference: file.filename,
          contentType: file.mimetype,
          sizeInBytes: buffer.length,
        },
      });
      return reply.code(201).send(serializeSuggestion(suggestion));
    },
  );

  app.post(
    "/families/:familyId/suggestions/:suggestionId/confirm",
    {
      preHandler,
      schema: {
        params: suggestionParams,
        body: {
          type: "object",
          properties: {
            amount: { type: "integer", minimum: 1 },
            currency: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
            tagId: { type: ["string", "null"], minLength: 1 },
            occurredOn: { type: "string", format: "date-time" },
            title: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, suggestionId } = request.params as {
        familyId: string;
        suggestionId: string;
      };
      const body = request.body as {
        amount?: number;
        currency?: string;
        categoryId?: string;
        tagId?: string | null;
        occurredOn?: string;
        title?: string;
      };
      const item = await deps.confirmSuggestionUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        suggestionId: SuggestionId.of(suggestionId),
        edits: {
          ...(body.amount === undefined
            ? {}
            : { amount: Money.of(body.amount, Currency.of(body.currency ?? "CLP")) }),
          ...(body.categoryId === undefined ? {} : { categoryId: body.categoryId }),
          ...(body.tagId === undefined ? {} : { tagId: body.tagId }),
          ...(body.occurredOn === undefined
            ? {}
            : { occurredOn: TransactionDate.of(new Date(body.occurredOn)) }),
          ...(body.title === undefined ? {} : { title: body.title }),
        },
      });
      return reply.code(201).send(serializeFinancialItem(item));
    },
  );

  app.delete(
    "/families/:familyId/suggestions/:suggestionId",
    { preHandler, schema: { params: suggestionParams } },
    async (request, reply) => {
      const { familyId, suggestionId } = request.params as {
        familyId: string;
        suggestionId: string;
      };
      await deps.discardSuggestionUseCase.execute({
        familyId: FamilyId.of(familyId),
        suggestionId: SuggestionId.of(suggestionId),
      });
      return reply.code(204).send();
    },
  );
}

function isSupportedImage(contentType: string, bytes: Buffer): boolean {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === "image/webp") {
    return (
      bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP"
    );
  }
  return false;
}

function serializeSuggestion(suggestion: {
  id: { toString(): string };
  familyId: string;
  requestedBy: string;
  status: string;
  suggestedAmount: Money;
  suggestedCategoryId: string | null;
  suggestedTagId: string | null;
  suggestedDate: TransactionDate;
  confidence: { value: number };
  expiresAt: Date;
  suggestedTitle: string | null;
  rawInput?: string;
  merchantName?: { toString(): string };
  receiptImageRef?: { toString(): string };
}) {
  return {
    id: suggestion.id.toString(),
    familyId: suggestion.familyId,
    requestedBy: suggestion.requestedBy,
    status: suggestion.status,
    source: suggestion.merchantName ? "RECEIPT" : "TEXT",
    amount: toMoneyDto(suggestion.suggestedAmount),
    categoryId: suggestion.suggestedCategoryId,
    tagId: suggestion.suggestedTagId,
    occurredOn: suggestion.suggestedDate.value.toISOString(),
    title: suggestion.suggestedTitle,
    confidence: suggestion.confidence.value,
    expiresAt: suggestion.expiresAt.toISOString(),
    ...(suggestion.rawInput === undefined ? {} : { rawInput: suggestion.rawInput }),
    ...(suggestion.merchantName === undefined
      ? {}
      : { merchantName: suggestion.merchantName.toString() }),
    ...(suggestion.receiptImageRef === undefined
      ? {}
      : { receiptImageRef: suggestion.receiptImageRef.toString() }),
  };
}

function serializeFinancialItem(item: {
  id: { toString(): string };
  type: string;
  amount: Money;
  categoryAssignment: { categoryId: { toString(): string }; tagId: { toString(): string } | null };
  paymentMethodId?: { toString(): string };
  title: { toString(): string };
  note: { toString(): string } | null;
  occurredOn: TransactionDate;
  createdAt: Date;
}) {
  return {
    id: item.id.toString(),
    type: item.type,
    amount: toMoneyDto(item.amount),
    categoryId: item.categoryAssignment.categoryId.toString(),
    tagId: item.categoryAssignment.tagId?.toString() ?? null,
    paymentMethodId: item.paymentMethodId?.toString() ?? null,
    title: item.title.toString(),
    note: item.note?.toString() ?? null,
    occurredOn: item.occurredOn.value.toISOString(),
    createdAt: item.createdAt.toISOString(),
  };
}

export type { AiAssistanceRoutesDependencies };
export { registerAiAssistanceRoutes };
