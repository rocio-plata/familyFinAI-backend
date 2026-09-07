// src/platform/auth/auth.module.ts
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { TokenService } from "./tokens.js";

interface AuthModuleDependencies {
  tokenService: TokenService;
  authenticate: preHandlerHookHandler;
}

interface AuthModule {
  registerRoutes(app: FastifyInstance): void;
}

function buildAuthModule(deps: AuthModuleDependencies): AuthModule {
  return {
    registerRoutes(app: FastifyInstance): void {
      app.post(
        "/auth/refresh",
        {
          schema: {
            body: {
              type: "object",
              required: ["refreshToken"],
              properties: {
                refreshToken: { type: "string", minLength: 1 },
              },
            },
          },
        },
        async (request, reply) => {
          const { refreshToken } = request.body as { refreshToken: string };
          const tokens = await deps.tokenService.refresh(refreshToken);

          return reply.code(200).send(tokens);
        },
      );

      app.post("/auth/logout", { preHandler: deps.authenticate }, async (request, reply) => {
        await deps.tokenService.revokeAll(request.userId);

        return reply.code(204).send();
      });
    },
  };
}

export type { AuthModule, AuthModuleDependencies };
export { buildAuthModule };
