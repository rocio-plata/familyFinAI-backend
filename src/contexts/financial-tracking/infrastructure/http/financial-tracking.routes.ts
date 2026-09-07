// src/contexts/financial-tracking/infrastructure/http/financial-tracking.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { Role } from "../../../family-access/domain/value-objects/role.js";
import type { AddTagToCategoryUseCase } from "../../application/commands/add-tag-to-category.usecase.js";
import type { CreateCategoryUseCase } from "../../application/commands/create-category.usecase.js";
import type { GetCategoriesQuery } from "../../application/queries/get-categories.query.js";
import { CategoryId } from "../../domain/value-objects/category-id.js";
import { CategoryName } from "../../domain/value-objects/category-name.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import { TagName } from "../../domain/value-objects/tag-name.js";

interface FinancialTrackingRoutesDependencies {
  authenticate: preHandlerHookHandler;
  requireFamilyMembership: (minRole?: Role) => preHandlerHookHandler;
  addTagToCategoryUseCase: AddTagToCategoryUseCase;
  createCategoryUseCase: CreateCategoryUseCase;
  getCategoriesQuery: GetCategoriesQuery;
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
