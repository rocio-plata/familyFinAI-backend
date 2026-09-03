// platform/app.ts
import Fastify, { type FastifyInstance } from "fastify";
import { registerErrorHandler } from "./http/error-handler.js";

type AppDependencies = Record<string, never>;

function buildApp(_dependencies: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: true });

  registerErrorHandler(app);

  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  return app;
}

export type { AppDependencies };
export { buildApp };
