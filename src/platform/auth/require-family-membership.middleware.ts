// platform/auth/require-family-membership.middleware.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetFamilyMembershipQuery } from "../../contexts/family-access/application/queries/get-family-membership.query.js";
import { FamilyId } from "../../contexts/family-access/domain/value-objects/family-id.js";
import type { Role } from "../../contexts/family-access/domain/value-objects/role.js";

function requireFamilyMembership(
  getFamilyMembershipQuery: GetFamilyMembershipQuery,
  minRole?: Role,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const familyId = FamilyId.of((request.params as { familyId: string }).familyId);

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

export { requireFamilyMembership };
