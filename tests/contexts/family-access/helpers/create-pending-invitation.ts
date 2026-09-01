// tests/contexts/family-access/helpers/create-pending-invitation.ts
import type { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import type { EmailAddress } from "../../../../src/contexts/family-access/domain/value-objects/email-address.js";
import type { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import type { Invitation } from "../../../../src/contexts/family-access/domain/entities/invitation.js";

function createPendingInvitation(family: Family, email: EmailAddress, role: Role): Invitation {
  const invitation = family.inviteMember(email, role);
  invitation.pullDomainEvents(); // descarta el MemberInvited generado en el setup del test
  return invitation;
}

export { createPendingInvitation };