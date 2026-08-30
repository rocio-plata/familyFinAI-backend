// src/contexts/family-access/domain/entities/invitation.ts

import { InvitationId } from '../value-objects/invitation-id.js';
import { FamilyId } from '../value-objects/family-id.js';
import { EmailAddress } from '../value-objects/email-address.js';
import { Role } from '../value-objects/role.js';
import { InvitationStatus } from '../value-objects/invitation-status.js';
import { UserId } from '../value-objects/user-id.js';

class Invitation {
  private constructor(
    private readonly id: InvitationId,
    private readonly familyId: FamilyId,     // solo referencia por ID
    private readonly invitedEmail: EmailAddress,
    private readonly role: Role,
    private status: InvitationStatus,         // Pending | Accepted | Expired | Revoked
    private readonly expiresAt: Date,
  ) {}

  accept(acceptingUserId: UserId): void {
    // invariante: no se puede aceptar si status !== Pending
    // invariante: no se puede aceptar si ya expiró
    // dispara InvitationAccepted (evento que Family escucha para agregar al Member)
  }

  revoke(): void { this.status = InvitationStatus.Revoked; }
}

export { Invitation };