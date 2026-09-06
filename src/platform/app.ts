// platform/app.ts
import Fastify, { type FastifyInstance } from "fastify";
import { authenticate } from "./auth/authenticate.middleware.js";
import type { JwtSigner } from "./auth/jwt-signer.js";
import { registerErrorHandler } from "./http/error-handler.js";
import { buildFamilyAccessModule, type FamilyAccessModuleDependencies } from "../contexts/family-access/family-access.module.js";

interface AppDependencies {
  jwtService: JwtSigner;
  familyAccess: FamilyAccessModuleDependencies;
}

function buildApp(dependencies: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: true });

  registerErrorHandler(app);

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  const familyAccessModule = buildFamilyAccessModule(dependencies.familyAccess);
  familyAccessModule.registerRoutes(app, authenticate(dependencies.jwtService));

  return app;
}

export type { AppDependencies };
export { buildApp };