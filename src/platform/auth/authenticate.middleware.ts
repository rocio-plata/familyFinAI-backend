// platform/auth/authenticate.middleware.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";
import type { JwtService } from "./jwt.js";

function authenticate(jwtService: JwtService) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) return reply.code(401).send({ error: "Missing token" });

    try {
      const payload = await jwtService.verify(token);
      request.userId = UserId.of(payload.sub);
    } catch {
      return reply.code(401).send({ error: "Invalid or expired token" });
    }
  };
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export { authenticate };
