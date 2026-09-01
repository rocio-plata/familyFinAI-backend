// platform/auth/authenticate.middleware.ts

import type { FastifyReply } from "fastify/types/reply.js";
import type { FastifyRequest } from "fastify/types/request.js";
import { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";
import { jwtService } from "./jwt.js";

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(request.headers.authorization);
  if (!token) return reply.code(401).send({ error: "Missing token" });

  try {
    const payload = await jwtService.verify(token);
    (request as any).userId = UserId.of(payload.sub); // solo identidad, nada de familia todavía
  } catch {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }
}

function extractBearerToken(authorization: string | undefined) {
  if (!authorization) return undefined;
  const parts = authorization.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return undefined;
  return parts[1];
}
