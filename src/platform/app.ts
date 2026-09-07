// /src/platform/app.ts
import Fastify, { type FastifyInstance } from "fastify";
import {
  buildFamilyAccessModule,
  type FamilyAccessModuleDependencies,
} from "../contexts/family-access/family-access.module.js";
import {
  buildFinancialTrackingModule,
  type FinancialTrackingModuleDependencies,
} from "../contexts/financial-tracking/financial-tracking.module.js";
import {
  buildIdentityModule,
  type IdentityModuleDependencies,
} from "../contexts/identity/identity.module.js";
import { registerIdentityRoutes } from "../contexts/identity/infrastructure/http/identity.routes.js";
import { buildAuthModule } from "./auth/auth.module.js";
import { authenticate } from "./auth/authenticate.middleware.js";
import type { JwtSigner } from "./auth/jwt-signer.js";
import { registerErrorHandler } from "./http/error-handler.js";
import { RegisterUserWithPersonalFamilyWorkflow } from "./workflows/register-user-with-personal-family.workflow.js";

interface AppDependencies {
  jwtService: JwtSigner;
  familyAccess: FamilyAccessModuleDependencies;
  identity: IdentityModuleDependencies;
  financialTracking?: FinancialTrackingModuleDependencies;
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
  const financialTrackingModule = dependencies.financialTracking
    ? buildFinancialTrackingModule(
        dependencies.financialTracking,
        familyAccessModule.useCases.getFamilyMembership,
      )
    : null;
  const authenticateRequest = authenticate(dependencies.jwtService);
  const authModule = buildAuthModule({
    tokenService: dependencies.identity.tokenService,
    authenticate: authenticateRequest,
  });

  // capa de composición: el workflow conoce ambos contextos, ninguno de los dos se conoce entre sí
  const registerWorkflow = new RegisterUserWithPersonalFamilyWorkflow(
    identityModule.useCases.registerUser,
    familyAccessModule.useCases.createFamily,
  );
  registerIdentityRoutes(app, {
    registerWorkflow,
    loginUseCase: identityModule.useCases.login,
    getUserProfileQuery: identityModule.useCases.getUserProfile,
    changePasswordUseCase: identityModule.useCases.changePassword,
    updateDisplayNameUseCase: identityModule.useCases.updateDisplayName,
    authenticate: authenticateRequest,
  });

  authModule.registerRoutes(app);
  familyAccessModule.registerRoutes(app, authenticateRequest);
  financialTrackingModule?.registerRoutes(app, authenticateRequest);

  return app;
}

export type { AppDependencies };
export { buildApp };
