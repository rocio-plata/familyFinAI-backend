// /src/contexts/identity/infrastructure/http/identity.routes.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { RegisterUserWithPersonalFamilyWorkflow } from "../../../../platform/workflows/register-user-with-personal-family.workflow.js";
import type { ChangePasswordUseCase } from "../../application/commands/change-password.usecase.js";
import type { LoginUseCase } from "../../application/commands/login.usecase.js";
import type { GetUserProfileQuery } from "../../application/queries/get-user-profile.query.js";

interface IdentityRoutesDependencies {
  registerWorkflow: RegisterUserWithPersonalFamilyWorkflow;
  loginUseCase: LoginUseCase;
  getUserProfileQuery: GetUserProfileQuery;
  changePasswordUseCase: ChangePasswordUseCase;
  authenticate: preHandlerHookHandler;
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

  app.get("/me/profile", { preHandler: deps.authenticate }, async (request, reply) => {
    const profile = await deps.getUserProfileQuery.execute({ userId: request.userId });

    return reply.code(200).send({
      email: profile.email,
      displayName: profile.displayName,
      createdAt: profile.createdAt.toISOString(),
    });
  });

  app.patch(
    "/me/password",
    {
      preHandler: deps.authenticate,
      schema: {
        body: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: { type: "string", minLength: 1 },
            newPassword: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      await deps.changePasswordUseCase.execute({
        userId: request.userId,
        currentPassword,
        newPassword,
      });

      return reply.code(204).send();
    },
  );
}

export type { IdentityRoutesDependencies };
export { registerIdentityRoutes };
