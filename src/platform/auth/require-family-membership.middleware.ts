// platform/auth/require-family-membership.middleware.ts
import type { FastifyRequest } from "fastify/types/request.js";
import type { FastifyReply } from "fastify/types/reply.js";

import { FamilyId } from "../../contexts/family-access/domain/value-objects/family-id.js";
import type { RoleType } from "../../contexts/family-access/domain/value-objects/role.js";


function requireFamilyMembership(minRole?: RoleType) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const familyId = FamilyId.of(request.params.familyId);   // viene de la ruta, ej. /families/:familyId/items

    const membership = await getFamilyMembershipQuery.execute({
      userId: request.userId,
      familyId,
    });

    if (!membership) {
      return reply.code(403).send({ error: "Not a member of this family" });
    }

    if (minRole && !membership.role.satisfies(minRole)) {
      return reply.code(403).send({ error: "Insufficient role" });
    }

    request.familyContext = { familyId, role: membership.role };
  };
}