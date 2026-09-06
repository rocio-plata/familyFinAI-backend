// /src/platform/app.ts
import Fastify, { type FastifyInstance } from "fastify";
import {
  buildFamilyAccessModule,
  type FamilyAccessModuleDependencies,
} from "../contexts/family-access/family-access.module.js";
import {
  buildIdentityModule,
  type IdentityModuleDependencies,
} from "../contexts/identity/identity.module.js";
import { registerIdentityRoutes } from "../contexts/identity/infrastructure/http/identity.routes.js";
import { authenticate } from "./auth/authenticate.middleware.js";
import type { JwtSigner } from "./auth/jwt-signer.js";
import { registerErrorHandler } from "./http/error-handler.js";
import { RegisterUserWithPersonalFamilyWorkflow } from "./workflows/register-user-with-personal-family.workflow.js";

interface AppDependencies {
  jwtService: JwtSigner;
  familyAccess: FamilyAccessModuleDependencies;
  identity: IdentityModuleDependencies;
  logLevel?: string;
}

function buildApp(dependencies: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: { level: dependencies.logLevel ?? "info" } });

  registerErrorHandler(app);

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  const familyAccessModule = buildFamilyAccessModule(dependencies.familyAccess);
  const identityModule = buildIdentityModule(dependencies.identity);

  // capa de composición: el workflow conoce ambos contextos, ninguno de los dos se conoce entre sí
  const registerWorkflow = new RegisterUserWithPersonalFamilyWorkflow(
    identityModule.useCases.registerUser,
    familyAccessModule.useCases.createFamily,
  );
  registerIdentityRoutes(app, { registerWorkflow });

  familyAccessModule.registerRoutes(app, authenticate(dependencies.jwtService));

  return app;
}

export type { AppDependencies };
export { buildApp };
