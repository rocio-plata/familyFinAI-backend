// contexts/family-access/application/queries/get-family-membership.query.ts (tipo de salida, definido en el mismo archivo)
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { UserId } from "../../domain/value-objects/user-id.js";
import type { Role } from "../../domain/value-objects/role.js";

interface FamilyMembership {
  familyId: FamilyId;
  userId: UserId;
  role: Role;
  joinedAt: Date;
}