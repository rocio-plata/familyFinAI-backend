// /src/platform/auth/require-family-membership.middleware.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetFamilyMembershipQuery } from "../../contexts/family-access/application/queries/get-family-membership.query.js";
import { InsufficientRoleError } from "../../contexts/family-access/domain/errors/insufficient-role.error.js";
import { NotAFamilyMemberError } from "../../contexts/family-access/domain/errors/not-a-family-member.error.js";
import { FamilyId } from "../../contexts/family-access/domain/value-objects/family-id.js";
import type { Role } from "../../contexts/family-access/domain/value-objects/role.js";

function requireFamilyMembership(
  getFamilyMembershipQuery: GetFamilyMembershipQuery,
  minRole?: Role,
) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const familyId = FamilyId.of((request.params as { familyId: string }).familyId);

    const membership = await getFamilyMembershipQuery.execute({
      userId: request.userId,
      familyId,
    });

    if (!membership) throw new NotAFamilyMemberError();

    if (minRole && !membership.role.satisfies(minRole)) throw new InsufficientRoleError();

    request.familyContext = { familyId, role: membership.role };
  };
}

export { requireFamilyMembership };
