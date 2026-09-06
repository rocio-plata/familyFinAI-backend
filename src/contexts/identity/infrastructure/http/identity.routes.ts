// /src/contexts/identity/infrastructure/http/identity.routes.ts
import type { FastifyInstance } from "fastify";
import type { RegisterUserWithPersonalFamilyWorkflow } from "../../../../platform/workflows/register-user-with-personal-family.workflow.js";
import type { LoginUseCase } from "../../application/commands/login.usecase.js";

interface IdentityRoutesDependencies {
  registerWorkflow: RegisterUserWithPersonalFamilyWorkflow;
  loginUseCase: LoginUseCase;
}

function registerIdentityRoutes(app: FastifyInstance, deps: IdentityRoutesDependencies): void {
  app.post(
    "/auth/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password", "displayName"],
          properties: {
            email: { type: "string", minLength: 1 },
            password: { type: "string", minLength: 1 },
            displayName: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, displayName } = request.body as {
        email: string;
        password: string;
        displayName: string;
      };

      const result = await deps.registerWorkflow.execute({ email, password, displayName });

      return reply.code(201).send({
        userId: result.user.id.toString(),
        email: result.user.email.toString(),
        displayName: result.user.displayName.toString(),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        defaultFamilyId: result.defaultFamilyId.toString(),
      });
    },
  );

  app.post(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", minLength: 1 },
            password: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string };

      const result = await deps.loginUseCase.execute({ email, password });

      return reply.code(200).send({
        userId: result.user.id.toString(),
        email: result.user.email.toString(),
        displayName: result.user.displayName.toString(),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    },
  );
}

export type { IdentityRoutesDependencies };
export { registerIdentityRoutes };
