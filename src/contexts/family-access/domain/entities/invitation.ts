// src/contexts/family-access/domain/entities/invitation.ts

import { InvitationId } from '../value-objects/invitation-id.js';
import { FamilyId } from '../value-objects/family-id.js';
import { EmailAddress } from '../value-objects/email-address.js';
import { Role } from '../value-objects/role.js';
import { InvitationStatus } from '../value-objects/invitation-status.js';
import { UserId } from '../value-objects/user-id.js';
import type { DomainEvent } from '../../../../shared-kernel/domain/domain-event.js';
import { InvitationNotPendingError } from '../errors/invitation-not-pending.error.js';
import { InvitationExpiredError } from '../errors/invitation-expired.error.js';
import { InvitationNotAcceptedError } from '../errors/invitation-not-accepted.error.js';

class Invitation {
  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: InvitationId,
    private readonly _familyId: FamilyId,
    private readonly _invitedEmail: EmailAddress,
    private readonly _role: Role,
    private _status: InvitationStatus,
    private readonly _expiresAt: Date,
    private _invitedUserId: UserId | null,   // se completa recién al aceptar
  ) {}

  get id(): InvitationId { return this._id; }
  get familyId(): FamilyId { return this._familyId; }
  get invitedEmail(): EmailAddress { return this._invitedEmail; }
  get role(): Role { return this._role; }
  get status(): InvitationStatus { return this._status; }
  get expiresAt(): Date { return this._expiresAt; }
  get invitedUserId(): UserId {
    if (!this._invitedUserId) throw new InvitationNotAcceptedError(this._id);
    return this._invitedUserId;
  }

  static create(familyId: FamilyId, email: EmailAddress, role: Role): Invitation {
    const invitation = new Invitation(
      InvitationId.generate(), familyId, email, role,
      InvitationStatus.Pending, addDays(new Date(), 7), null,
    );
    // invitation.domainEvents.push(new MemberInvited(invitation.id, familyId, email)); // cuando esté integrado con eventos de dominio, se puede agregar un evento de "MemberInvited" aquí
    return invitation;
  }

  accept(acceptingUserId: UserId): void {
    if (this._status !== InvitationStatus.Pending) throw new InvitationNotPendingError(this._id);
    if (this._expiresAt < new Date()) throw new InvitationExpiredError(this._id);

    this._status = InvitationStatus.Accepted;
    this._invitedUserId = acceptingUserId;
    // this.domainEvents.push(new InvitationAccepted(this.id, this.familyId, acceptingUserId, this.role)); // cuando esté integrado con eventos de dominio, se puede agregar un evento de "InvitationAccepted" aquí
  }

  revoke(): void {
    this._status = InvitationStatus.Revoked;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}

export { Invitation };

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
