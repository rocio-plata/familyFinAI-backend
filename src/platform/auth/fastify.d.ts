// platform/auth/fastify.d.ts
import "fastify";
import type { FamilyId } from "../../contexts/family-access/domain/value-objects/family-id.js";
import type { Role } from "../../contexts/family-access/domain/value-objects/role.js";
import type { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: UserId;
    familyContext?: {
      familyId: FamilyId;
      role: Role;
    };
  }
}
