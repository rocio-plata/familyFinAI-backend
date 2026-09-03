// contexts/family-access/infrastructure/http/family.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";
import type { CreateFamilyUseCase } from "../../application/commands/create-family.usecase.js";

interface FamilyRoutesDependencies {
  authenticate: preHandlerHookHandler;
  createFamilyUseCase: CreateFamilyUseCase;
}

function registerFamilyRoutes(app: FastifyInstance, deps: FamilyRoutesDependencies): void {
  app.post("/families", { preHandler: [deps.authenticate] }, async (request, reply) => {
    const body = request.body as { name?: unknown };

    if (typeof body.name !== "string") {
      throw new (class extends DomainError {
        readonly code = "FAMILY_ACCESS.INVALID_REQUEST_BODY";
        constructor() {
          super("El campo 'name' es requerido");
        }
      })();
    }

    const family = await deps.createFamilyUseCase.execute({
      name: body.name,
      createdBy: request.userId,
    });

    return reply.code(201).send({
      id: family.id.toString(),
      name: family.name.toString(),
      defaultCurrency: family.defaultCurrency.toString(),
    });
  });
}

export type { FamilyRoutesDependencies };
export { registerFamilyRoutes };
