// /src/contexts/family-access/infrastructure/http/family.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { CreateFamilyUseCase } from "../../application/commands/create-family.usecase.js";

interface FamilyRoutesDependencies {
  authenticate: preHandlerHookHandler;
  createFamilyUseCase: CreateFamilyUseCase;
}

function registerFamilyRoutes(app: FastifyInstance, deps: FamilyRoutesDependencies): void {
  app.post(
    "/families",
    {
      preHandler: [deps.authenticate],
      schema: {
        body: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { name } = request.body as { name: string }; // ya validado por el schema

      const family = await deps.createFamilyUseCase.execute({ name, createdBy: request.userId });

      return reply.code(201).send({
        id: family.id.toString(),
        name: family.name.toString(),
        defaultCurrency: family.defaultCurrency.toString(),
      });
    },
  );
}

export type { FamilyRoutesDependencies };
export { registerFamilyRoutes };
