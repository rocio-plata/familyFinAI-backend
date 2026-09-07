// src/contexts/financial-tracking/infrastructure/http/financial-tracking.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CreateCategoryUseCase } from "../../application/commands/create-category.usecase.js";
import { CategoryName } from "../../domain/value-objects/category-name.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";

interface FinancialTrackingRoutesDependencies {
  authenticate: preHandlerHookHandler;
  createCategoryUseCase: CreateCategoryUseCase;
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
}

export type { FinancialTrackingRoutesDependencies };
export { registerFinancialTrackingRoutes };
