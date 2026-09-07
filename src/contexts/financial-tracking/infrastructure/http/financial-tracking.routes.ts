// src/contexts/financial-tracking/infrastructure/http/financial-tracking.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { Role } from "../../../family-access/domain/value-objects/role.js";
import type { AddTagToCategoryUseCase } from "../../application/commands/add-tag-to-category.usecase.js";
import type { CreateCategoryUseCase } from "../../application/commands/create-category.usecase.js";
import type { DeleteCategoryUseCase } from "../../application/commands/delete-category.usecase.js";
import type { DeprecateCategoryUseCase } from "../../application/commands/deprecate-category.usecase.js";
import type { DeprecateTagUseCase } from "../../application/commands/deprecate-tag.usecase.js";
import type { RenameCategoryUseCase } from "../../application/commands/rename-category.usecase.js";
import type { RenameTagUseCase } from "../../application/commands/rename-tag.usecase.js";
import type { ReorderCategoryTagsUseCase } from "../../application/commands/reorder-category-tags.usecase.js";
import type { GetCategoriesQuery } from "../../application/queries/get-categories.query.js";
import { CategoryId } from "../../domain/value-objects/category-id.js";
import { CategoryName } from "../../domain/value-objects/category-name.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import { TagId } from "../../domain/value-objects/tag-id.js";
import { TagName } from "../../domain/value-objects/tag-name.js";

interface FinancialTrackingRoutesDependencies {
  authenticate: preHandlerHookHandler;
  requireFamilyMembership: (minRole?: Role) => preHandlerHookHandler;
  addTagToCategoryUseCase: AddTagToCategoryUseCase;
  createCategoryUseCase: CreateCategoryUseCase;
  deleteCategoryUseCase: DeleteCategoryUseCase;
  deprecateCategoryUseCase: DeprecateCategoryUseCase;
  deprecateTagUseCase: DeprecateTagUseCase;
  getCategoriesQuery: GetCategoriesQuery;
  renameCategoryUseCase: RenameCategoryUseCase;
  renameTagUseCase: RenameTagUseCase;
  reorderCategoryTagsUseCase: ReorderCategoryTagsUseCase;
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
