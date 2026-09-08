// /src/contexts/family-access/domain/entities/invitation.ts

import type { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import { EmailAddress } from "../../../../shared-kernel/domain/email-address.js";
import { addDays } from "../../../../shared-kernel/domain/util/date.js";
import { InvitationExpiredError } from "../errors/invitation-expired.error.js";
import { InvitationNotAcceptedError } from "../errors/invitation-not-accepted.error.js";
import { InvitationNotPendingError } from "../errors/invitation-not-pending.error.js";
import { InvitationAccepted } from "../events/invitation-accepted.event.js";
import { MemberInvited } from "../events/member-invited.event.js";
import { FamilyId } from "../value-objects/family-id.js";
import { InvitationId } from "../value-objects/invitation-id.js";
import { InvitationStatus } from "../value-objects/invitation-status.js";
import { Role } from "../value-objects/role.js";
import { UserId } from "../value-objects/user-id.js";

interface ReconstituteInvitationProps {
  id: string;
  familyId: string;
  invitedEmail: string;
  role: "OWNER" | "MEMBER";
  status: InvitationStatus;
  expiresAt: Date;
  invitedUserId: string | null;
}

class Invitation {
  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: InvitationId,
    private readonly _familyId: FamilyId,
    private readonly _invitedEmail: EmailAddress,
    private readonly _role: Role,
    private _status: InvitationStatus,
    private readonly _expiresAt: Date,
    private _invitedUserId: UserId | null, // se completa recién al aceptar
  ) {}

  get id(): InvitationId {
    return this._id;
  }
  get familyId(): FamilyId {
    return this._familyId;
  }
  get invitedEmail(): EmailAddress {
    return this._invitedEmail;
  }
  get role(): Role {
    return this._role;
  }
  get status(): InvitationStatus {
    return this._status;
  }
  get expiresAt(): Date {
    return this._expiresAt;
  }
  get invitedUserId(): UserId {
    if (!this._invitedUserId) throw new InvitationNotAcceptedError(this._id);
    return this._invitedUserId;
  }

  static create(familyId: FamilyId, email: EmailAddress, role: Role): Invitation {
    const invitation = new Invitation(
      InvitationId.generate(),
      familyId,
      email,
      role,
      InvitationStatus.Pending,
      addDays(new Date(), 7),
      null,
    );
    invitation.domainEvents.push(new MemberInvited(familyId, email)); // cuando esté integrado con eventos de dominio, se puede agregar un evento de "MemberInvited" aquí
    return invitation;
  }

  static reconstitute(props: ReconstituteInvitationProps): Invitation {
    return new Invitation(
      InvitationId.of(props.id),
      FamilyId.of(props.familyId),
      EmailAddress.of(props.invitedEmail),
      props.role === "OWNER" ? Role.owner() : Role.member(),
      props.status,
      props.expiresAt,
      props.invitedUserId ? UserId.of(props.invitedUserId) : null,
    );
  }

  accept(acceptingUserId: UserId): void {
    if (this._status !== InvitationStatus.Pending) throw new InvitationNotPendingError(this._id);
    if (this._expiresAt < new Date()) throw new InvitationExpiredError(this._id);

    this._status = InvitationStatus.Accepted;
    this._invitedUserId = acceptingUserId;
    this.domainEvents.push(
      new InvitationAccepted(this._id, this.familyId, acceptingUserId, this._role),
    ); // cuando esté integrado con eventos de dominio, se puede agregar un evento de "InvitationAccepted" aquí
  }

  revoke(): void {
    if (this._status !== InvitationStatus.Pending) {
      throw new InvitationNotPendingError(this._id);
    }
    this._status = InvitationStatus.Revoked;
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}

export type { ReconstituteInvitationProps };
export { Invitation };
