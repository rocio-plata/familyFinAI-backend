// contexts/family-access/domain/entities/family.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import type { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import { CannotRemoveLastOwnerError } from "../errors/cannot-remove-last-owner.error.js";
import { InsufficientRoleError } from "../errors/insufficient-role.error.js";
import { MemberNotFoundError } from "../errors/member-not-found.error.js";
import { FamilyCreated } from "../events/family-created.event.js";
import { MemberRemoved } from "../events/member-removed.event.js";
import { MemberRoleChanged } from "../events/member-role-changed.event.js";
import type { EmailAddress } from "../value-objects/email-address.js";
import { FamilyId } from "../value-objects/family-id.js";
import type { FamilyName } from "../value-objects/family-name.js";
import type { Role } from "../value-objects/role.js";
import type { UserId } from "../value-objects/user-id.js";
import { Invitation } from "./invitation.js";
import { Member } from "./member.js";

class Family {
  private domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: FamilyId,
    private _name: FamilyName,
    private _members: Member[],
    private _defaultCurrency: Currency,
    private readonly _createdBy: UserId,
    private readonly _createdAt: Date,
  ) {}

  get id(): FamilyId {
    return this._id;
  }
  get name(): FamilyName {
    return this._name;
  }
  get members(): readonly Member[] {
    return this._members;
  }
  get defaultCurrency(): Currency {
    return this._defaultCurrency;
  }
  get createdBy(): UserId {
    return this._createdBy;
  }
  get createdAt(): Date {
    return this._createdAt;
  }

  static create(name: FamilyName, creator: UserId): Family {
    const family = new Family(
      FamilyId.generate(),
      name,
      [],
      Currency.default(),
      creator,
      new Date(),
    );
    family._members.push(Member.createOwner(creator));
    family.domainEvents.push(new FamilyCreated(family.id)); // cuando esté integrado con eventos de dominio, se puede agregar un evento de "FamilyCreated" aquí
    return family;
  }

  findMembership(userId: UserId): Member | null {
    return this._members.find((m) => m.userId.equals(userId)) ?? null;
  }

  inviteMember(email: EmailAddress, role: Role): Invitation {
    if (
      this._members.some(
        (_m) => /* comparar email requiere resolver userId → email en otro lugar */ false,
      )
    ) {
      // invariante: no invitar a alguien que ya es miembro (pendiente de resolver la comparación)
    }
    return Invitation.create(this.id, email, role);
  }

  removeMember(memberId: UserId, removedBy: UserId): void {
    const remover = this.findMembership(removedBy);
    if (!remover?.role.canRemoveMembers()) throw new InsufficientRoleError();

    const target = this.findMembership(memberId);
    if (!target) throw new MemberNotFoundError(memberId);

    const remainingOwners = this._members.filter(
      (m) => m.role.isOwner() && !m.userId.equals(memberId),
    );
    if (remainingOwners.length === 0) throw new CannotRemoveLastOwnerError();

    this._members = this._members.filter((m) => !m.userId.equals(memberId));
    this.domainEvents.push(new MemberRemoved(this.id, memberId, removedBy));
  }

  changeRole(memberId: UserId, newRole: Role, changedBy: UserId): void {
    const changer = this.findMembership(changedBy);
    if (!changer?.role.isOwner()) throw new InsufficientRoleError();

    const member = this.findMembership(memberId);
    if (!member) throw new MemberNotFoundError(memberId);

    const wouldRemainOwner = this._members.some(
      (m) => m.role.isOwner() && (!m.userId.equals(memberId) || newRole.isOwner()),
    );
    if (!wouldRemainOwner) throw new CannotRemoveLastOwnerError();

    member.changeRole(newRole);
    this.domainEvents.push(new MemberRoleChanged(this.id, memberId, newRole, changedBy));
  }

  changeDefaultCurrency(newCurrency: Currency): void {
    this._defaultCurrency = newCurrency;
  }

  addMemberFromInvitation(invitation: Invitation): void {
    this.addMemberFromInvitationData(invitation.invitedUserId, invitation.role);
  }

  addMemberFromInvitationData(userId: UserId, role: Role): void {
    this._members.push(Member.create(userId, role));
  }

  pullDomainEvents(): DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}

export { Family };
