// /src/platform/auth/authenticate.middleware.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";
import type { JwtSigner } from "./jwt-signer.js";

function authenticate(jwtSigner: JwtSigner) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const token = extractBearerToken(authHeader);
    request.log.debug(
      { authHeader: maskToken(authHeader), token: maskToken(token) },
      "authenticate: token recibido",
    );

    if (!token) return reply.code(401).send({ error: "Missing token" });

    try {
      const payload = await jwtSigner.verify(token);
      request.userId = UserId.of(payload.sub);
    } catch (err) {
      request.log.debug({ err }, "authenticate: verificación de token fallida");
      return reply.code(401).send({ error: "Invalid or expired token" });
    }
  };
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

// muestra solo el inicio/fin del valor para poder identificarlo en logs sin exponer la credencial completa
function maskToken(value: string | undefined | null): string {
  if (!value) return "<none>";
  if (value.length <= 12) return "***";
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export { authenticate };
