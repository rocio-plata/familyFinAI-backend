// platform/http/error-handler.ts
import type { FastifyError, FastifyInstance } from "fastify";
import { DomainError } from "../../shared-kernel/errors/domain-error.js";
import { resolveHttpStatus } from "./domain-error-http-status.js";

function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | DomainError, request, reply) => {
    if (error instanceof DomainError) {
      const status = resolveHttpStatus(error);
      return reply.code(status).send({ error: error.code, message: error.message });
    }

    request.log.error(error);
    return reply
      .code(500)
      .send({ error: "INTERNAL.UNEXPECTED_ERROR", message: "Something went wrong" });
  });
}

export { registerErrorHandler };
