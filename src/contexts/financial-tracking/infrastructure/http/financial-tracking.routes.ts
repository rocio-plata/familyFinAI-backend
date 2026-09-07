// src/contexts/financial-tracking/infrastructure/http/financial-tracking.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import type { GetFamilyDefaultCurrencyQuery } from "../../../family-access/application/queries/get-family-default-currency.query.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { Role } from "../../../family-access/domain/value-objects/role.js";
import type { AddTagToCategoryUseCase } from "../../application/commands/add-tag-to-category.usecase.js";
import type { CreateCategoryUseCase } from "../../application/commands/create-category.usecase.js";
import type { CreateFinancialItemUseCase } from "../../application/commands/create-financial-item.usecase.js";
import type { DeleteCategoryUseCase } from "../../application/commands/delete-category.usecase.js";
import type { DeleteFinancialItemUseCase } from "../../application/commands/delete-financial-item.usecase.js";
import type { DeleteTagUseCase } from "../../application/commands/delete-tag.usecase.js";
import type { DeprecateCategoryUseCase } from "../../application/commands/deprecate-category.usecase.js";
import type { DeprecateTagUseCase } from "../../application/commands/deprecate-tag.usecase.js";
import type { ReclassifyFinancialItemUseCase } from "../../application/commands/reclassify-financial-item.usecase.js";
import type { RenameCategoryUseCase } from "../../application/commands/rename-category.usecase.js";
import type { RenameTagUseCase } from "../../application/commands/rename-tag.usecase.js";
import type { ReorderCategoryTagsUseCase } from "../../application/commands/reorder-category-tags.usecase.js";
import type { UpdateFinancialItemUseCase } from "../../application/commands/update-financial-item.usecase.js";
import type { GetCategoriesQuery } from "../../application/queries/get-categories.query.js";
import type { GetFinancialItemsQuery } from "../../application/queries/get-financial-items.query.js";
import { CategoryId } from "../../domain/value-objects/category-id.js";
import { CategoryName } from "../../domain/value-objects/category-name.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import { FinancialItemId } from "../../domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../domain/value-objects/financial-item-type.js";
import { Money } from "../../domain/value-objects/money.js";
import { Note } from "../../domain/value-objects/note.js";
import { TagId } from "../../domain/value-objects/tag-id.js";
import { TagName } from "../../domain/value-objects/tag-name.js";
import { Title } from "../../domain/value-objects/title.js";
import { TransactionDate } from "../../domain/value-objects/transaction-date.js";

interface FinancialTrackingRoutesDependencies {
  authenticate: preHandlerHookHandler;
  requireFamilyMembership: (minRole?: Role) => preHandlerHookHandler;
  addTagToCategoryUseCase: AddTagToCategoryUseCase;
  createCategoryUseCase: CreateCategoryUseCase;
  createFinancialItemUseCase: CreateFinancialItemUseCase;
  deleteCategoryUseCase: DeleteCategoryUseCase;
  deleteFinancialItemUseCase: DeleteFinancialItemUseCase;
  deleteTagUseCase: DeleteTagUseCase;
  deprecateCategoryUseCase: DeprecateCategoryUseCase;
  deprecateTagUseCase: DeprecateTagUseCase;
  getCategoriesQuery: GetCategoriesQuery;
  getFinancialItemsQuery: GetFinancialItemsQuery;
  renameCategoryUseCase: RenameCategoryUseCase;
  renameTagUseCase: RenameTagUseCase;
  reclassifyFinancialItemUseCase: ReclassifyFinancialItemUseCase;
  reorderCategoryTagsUseCase: ReorderCategoryTagsUseCase;
  updateFinancialItemUseCase: UpdateFinancialItemUseCase;
  getFamilyDefaultCurrencyQuery: GetFamilyDefaultCurrencyQuery;
}

function registerFinancialTrackingRoutes(
  app: FastifyInstance,
  deps: FinancialTrackingRoutesDependencies,
): void {
  app.post(
    "/families/:familyId/categories",
    {
      preHandler: [deps.authenticate],
      schema: {
        params: {
          type: "object",
          required: ["familyId"],
          properties: { familyId: { type: "string", minLength: 1 } },
        },
        body: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const { name } = request.body as { name: string };
      const category = await deps.createCategoryUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        name: CategoryName.of(name),
      });

      return reply.code(201).send({
        id: category.id.toString(),
        name: category.name.toString(),
        status: CategoryStatus.Active,
      });
    },
  );

  app.post(
    "/families/:familyId/items",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership()],
      schema: {
        params: {
          type: "object",
          required: ["familyId"],
          properties: { familyId: { type: "string", minLength: 1 } },
        },
        body: {
          type: "object",
          required: ["amount", "categoryId", "title", "occurredOn"],
          properties: {
            type: { type: "string", enum: ["EXPENSE", "INCOME"] },
            amount: { type: "number" },
            currency: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
            tagId: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
            note: { type: "string" },
            occurredOn: { type: "string", format: "date-time" },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const { type, amount, currency, categoryId, tagId, title, note, occurredOn } =
        request.body as {
          type?: "EXPENSE" | "INCOME";
          amount: number;
          currency?: string;
          categoryId: string;
          tagId?: string;
          title: string;
          note?: string;
          occurredOn: string;
        };
      const parsedFamilyId = FamilyId.of(familyId);
      const resolvedCurrency = currency
        ? Currency.of(currency)
        : await deps.getFamilyDefaultCurrencyQuery.execute({ familyId: parsedFamilyId });
      const item = await deps.createFinancialItemUseCase.execute({
        familyId: parsedFamilyId,
        recordedBy: request.userId,
        amount: Money.of(amount, resolvedCurrency),
        categoryId: CategoryId.of(categoryId),
        tagId: tagId ? TagId.of(tagId) : null,
        title: Title.of(title),
        occurredOn: TransactionDate.of(new Date(occurredOn)),
        ...(type
          ? { type: type === "INCOME" ? FinancialItemType.Income : FinancialItemType.Expense }
          : {}),
        ...(note === undefined ? {} : { note: Note.of(note) }),
      });

      return reply.code(201).send({
        id: item.id.toString(),
        type: item.type,
        amount: item.amount.amount,
        currency: item.amount.currency.toString(),
        categoryId: item.categoryAssignment.categoryId.toString(),
        tagId: item.categoryAssignment.tagId?.toString() ?? null,
        title: item.title.toString(),
        note: item.note?.toString() ?? null,
        occurredOn: item.occurredOn.value.toISOString(),
      });
    },
  );

  app.get(
    "/families/:familyId/items",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership()],
      schema: {
        params: {
          type: "object",
          required: ["familyId"],
          properties: { familyId: { type: "string", minLength: 1 } },
        },
        querystring: {
          type: "object",
          properties: {
            from: { type: "string", format: "date-time" },
            to: { type: "string", format: "date-time" },
            categoryId: { type: "string", minLength: 1 },
            tagId: { type: "string", minLength: 1 },
            type: { type: "string", enum: ["EXPENSE", "INCOME"] },
          },
          dependencies: {
            from: ["to"],
            to: ["from"],
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const { from, to, categoryId, tagId, type } = request.query as {
        from?: string;
        to?: string;
        categoryId?: string;
        tagId?: string;
        type?: "EXPENSE" | "INCOME";
      };
      const items = await deps.getFinancialItemsQuery.execute({
        familyId: FamilyId.of(familyId),
        ...(from && to ? { period: { from: new Date(from), to: new Date(to) } } : {}),
        ...(categoryId ? { categoryId: CategoryId.of(categoryId) } : {}),
        ...(tagId ? { tagId: TagId.of(tagId) } : {}),
        ...(type
          ? { type: type === "INCOME" ? FinancialItemType.Income : FinancialItemType.Expense }
          : {}),
      });

      return reply.code(200).send(
        items.map((item) => ({
          id: item.id.toString(),
          familyId: item.familyId.toString(),
          recordedBy: item.recordedBy.toString(),
          type: item.type,
          amount: item.amount.amount,
          currency: item.amount.currency.toString(),
          categoryId: item.categoryId.toString(),
          tagId: item.tagId?.toString() ?? null,
          title: item.title.toString(),
          note: item.note?.toString() ?? null,
          occurredOn: item.occurredOn.toISOString(),
          createdAt: item.createdAt.toISOString(),
        })),
      );
    },
  );

  app.patch(
    "/families/:familyId/items/:itemId",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership()],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "itemId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            itemId: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          minProperties: 1,
          additionalProperties: false,
          properties: {
            amount: { type: "number" },
            currency: { type: "string", minLength: 1 },
            occurredOn: { type: "string", format: "date-time" },
            title: { type: "string", minLength: 1 },
            note: { type: ["string", "null"] },
          },
          dependencies: {
            amount: ["currency"],
            currency: ["amount"],
          },
          allOf: [
            { not: { required: ["categoryId"] } },
            { not: { required: ["tagId"] } },
            { not: { required: ["type"] } },
          ],
        },
      },
    },
    async (request, reply) => {
      const { familyId, itemId } = request.params as { familyId: string; itemId: string };
      const { amount, currency, occurredOn, title, note } = request.body as {
        amount?: number;
        currency?: string;
        occurredOn?: string;
        title?: string;
        note?: string | null;
      };
      const item = await deps.updateFinancialItemUseCase.execute({
        familyId: FamilyId.of(familyId),
        itemId: FinancialItemId.of(itemId),
        ...(amount === undefined || currency === undefined
          ? {}
          : { amount: Money.of(amount, Currency.of(currency)) }),
        ...(occurredOn === undefined
          ? {}
          : { occurredOn: TransactionDate.of(new Date(occurredOn)) }),
        ...(title === undefined ? {} : { title: Title.of(title) }),
        ...(note === undefined ? {} : { note: note === null ? null : Note.of(note) }),
      });

      return reply.code(200).send({
        id: item.id.toString(),
        type: item.type,
        amount: item.amount.amount,
        currency: item.amount.currency.toString(),
        categoryId: item.categoryAssignment.categoryId.toString(),
        tagId: item.categoryAssignment.tagId?.toString() ?? null,
        title: item.title.toString(),
        note: item.note?.toString() ?? null,
        occurredOn: item.occurredOn.value.toISOString(),
        createdAt: item.createdAt.toISOString(),
      });
    },
  );

  app.patch(
    "/families/:familyId/items/:itemId/category",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership()],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "itemId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            itemId: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          required: ["newCategoryId"],
          additionalProperties: false,
          properties: {
            newCategoryId: { type: "string", minLength: 1 },
            newTagId: { type: ["string", "null"], minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, itemId } = request.params as { familyId: string; itemId: string };
      const { newCategoryId, newTagId } = request.body as {
        newCategoryId: string;
        newTagId?: string | null;
      };
      const item = await deps.reclassifyFinancialItemUseCase.execute({
        familyId: FamilyId.of(familyId),
        itemId: FinancialItemId.of(itemId),
        newCategoryId: CategoryId.of(newCategoryId),
        newTagId: newTagId ? TagId.of(newTagId) : null,
      });

      return reply.code(200).send({
        id: item.id.toString(),
        type: item.type,
        amount: item.amount.amount,
        currency: item.amount.currency.toString(),
        categoryId: item.categoryAssignment.categoryId.toString(),
        tagId: item.categoryAssignment.tagId?.toString() ?? null,
        title: item.title.toString(),
        note: item.note?.toString() ?? null,
        occurredOn: item.occurredOn.value.toISOString(),
        createdAt: item.createdAt.toISOString(),
      });
    },
  );

  app.delete(
    "/families/:familyId/items/:itemId",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership()],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "itemId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            itemId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, itemId } = request.params as { familyId: string; itemId: string };

      await deps.deleteFinancialItemUseCase.execute({
        familyId: FamilyId.of(familyId),
        itemId: FinancialItemId.of(itemId),
      });

      return reply.code(204).send();
    },
  );

  app.patch(
    "/families/:familyId/categories/:categoryId",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "categoryId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { familyId, categoryId } = request.params as { familyId: string; categoryId: string };
      const { name } = request.body as { name: string };
      const category = await deps.renameCategoryUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        categoryId: CategoryId.of(categoryId),
        newName: CategoryName.of(name),
      });

      return reply.code(200).send({
        id: category.id.toString(),
        name: category.name.toString(),
        status: category.status,
      });
    },
  );

  app.post(
    "/families/:familyId/categories/:categoryId/deprecate",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "categoryId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, categoryId } = request.params as { familyId: string; categoryId: string };

      await deps.deprecateCategoryUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        categoryId: CategoryId.of(categoryId),
      });

      return reply.code(204).send();
    },
  );

  app.delete(
    "/families/:familyId/categories/:categoryId",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "categoryId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, categoryId } = request.params as { familyId: string; categoryId: string };

      await deps.deleteCategoryUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        categoryId: CategoryId.of(categoryId),
      });

      return reply.code(204).send();
    },
  );

  app.delete(
    "/families/:familyId/categories/:categoryId/tags/:tagId",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "categoryId", "tagId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
            tagId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, categoryId, tagId } = request.params as {
        familyId: string;
        categoryId: string;
        tagId: string;
      };

      await deps.deleteTagUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        categoryId: CategoryId.of(categoryId),
        tagId: TagId.of(tagId),
      });

      return reply.code(204).send();
    },
  );

  app.post(
    "/families/:familyId/categories/:categoryId/tags/:tagId/deprecate",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "categoryId", "tagId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
            tagId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, categoryId, tagId } = request.params as {
        familyId: string;
        categoryId: string;
        tagId: string;
      };

      await deps.deprecateTagUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        categoryId: CategoryId.of(categoryId),
        tagId: TagId.of(tagId),
      });

      return reply.code(204).send();
    },
  );

  app.patch(
    "/families/:familyId/categories/:categoryId/tags/:tagId",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "categoryId", "tagId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
            tagId: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { familyId, categoryId, tagId } = request.params as {
        familyId: string;
        categoryId: string;
        tagId: string;
      };
      const { name } = request.body as { name: string };
      const category = await deps.renameTagUseCase.execute({
        familyId: FamilyId.of(familyId),
        requestedBy: request.userId,
        categoryId: CategoryId.of(categoryId),
        tagId: TagId.of(tagId),
        newName: TagName.of(name),
      });
      const tag = category.tags.find((currentTag) => currentTag.id.equals(TagId.of(tagId)));
      if (!tag) throw new Error("Unreachable: renamed tag is part of the category");

      return reply.code(200).send({
        id: tag.id.toString(),
        name: tag.name.toString(),
        status: tag.status,
        displayOrder: tag.displayOrder,
      });
    },
  );

  app.put(
    "/families/:familyId/categories/:categoryId/tags/order",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "categoryId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          required: ["orderedTagIds"],
          properties: {
            orderedTagIds: {
              type: "array",
              items: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { familyId, categoryId } = request.params as { familyId: string; categoryId: string };
      const { orderedTagIds } = request.body as { orderedTagIds: string[] };

      await deps.reorderCategoryTagsUseCase.execute({
        familyId: FamilyId.of(familyId),
        categoryId: CategoryId.of(categoryId),
        orderedTagIds: orderedTagIds.map((tagId) => TagId.of(tagId)),
      });

      return reply.code(204).send();
    },
  );

  app.get(
    "/families/:familyId/categories",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership()],
      schema: {
        params: {
          type: "object",
          required: ["familyId"],
          properties: { familyId: { type: "string", minLength: 1 } },
        },
        querystring: {
          type: "object",
          properties: { includeDeprecated: { type: "boolean" } },
        },
      },
    },
    async (request, reply) => {
      const { familyId } = request.params as { familyId: string };
      const { includeDeprecated } = request.query as { includeDeprecated?: boolean };
      const categories = await deps.getCategoriesQuery.execute({
        familyId: FamilyId.of(familyId),
        ...(includeDeprecated === undefined ? {} : { includeDeprecated }),
      });

      return reply.code(200).send(
        categories.map((category) => ({
          id: category.id.toString(),
          name: category.name.toString(),
          status: category.status,
          tags: category.tags.map((tag) => ({
            id: tag.id.toString(),
            name: tag.name.toString(),
            status: tag.status,
            displayOrder: tag.displayOrder,
          })),
        })),
      );
    },
  );

  app.post(
    "/families/:familyId/categories/:categoryId/tags",
    {
      preHandler: [deps.authenticate, deps.requireFamilyMembership(Role.owner())],
      schema: {
        params: {
          type: "object",
          required: ["familyId", "categoryId"],
          properties: {
            familyId: { type: "string", minLength: 1 },
            categoryId: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { familyId, categoryId } = request.params as { familyId: string; categoryId: string };
      const { name } = request.body as { name: string };
      const category = await deps.addTagToCategoryUseCase.execute({
        familyId: FamilyId.of(familyId),
        categoryId: CategoryId.of(categoryId),
        tagName: TagName.of(name),
      });
      const tag = category.tags.at(-1);
      if (!tag) throw new Error("Unreachable: tag was just added to the category");

      return reply.code(201).send({
        id: tag.id.toString(),
        name: tag.name.toString(),
        status: tag.status,
        displayOrder: tag.displayOrder,
      });
    },
  );
}

export type { FinancialTrackingRoutesDependencies };
export { registerFinancialTrackingRoutes };
