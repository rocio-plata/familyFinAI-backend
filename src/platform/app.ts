// platform/app.ts
import Fastify, { type FastifyInstance } from "fastify";
import { CreateFamilyUseCase } from "../contexts/family-access/application/commands/create-family.usecase.js";
import type { FamilyRepository } from "../contexts/family-access/domain/repositories/family.repository.js";
import { registerFamilyRoutes } from "../contexts/family-access/infrastructure/http/family.routes.js";
import { authenticate } from "./auth/authenticate.middleware.js";
import type { JwtSigner } from "./auth/jwt-signer.js";
import type { EventBus } from "./events/event-bus.js";
import { registerErrorHandler } from "./http/error-handler.js";

interface AppDependencies {
  jwtService: JwtSigner;
  familyAccess: {
    familyRepository: FamilyRepository;
    eventBus: EventBus;
  };
}

function buildApp(dependencies: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: true });

  registerErrorHandler(app);

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  const createFamilyUseCase = new CreateFamilyUseCase(
    dependencies.familyAccess.familyRepository,
    dependencies.familyAccess.eventBus,
  );

  registerFamilyRoutes(app, {
    authenticate: authenticate(dependencies.jwtService),
    createFamilyUseCase,
  });

  return app;
}

export type { AppDependencies };
export { buildApp };
