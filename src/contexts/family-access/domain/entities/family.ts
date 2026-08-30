// contexts/family-access/domain/entities/family.ts

import { FamilyId } from '../value-objects/family-id.js';
import { FamilyName } from '../value-objects/family-name.js';
import { Member } from './member.js';
import { UserId } from '../value-objects/user-id.js';
import { EmailAddress } from '../value-objects/email-address.js';
import { Role } from '../value-objects/role.js';
import { Invitation } from './invitation.js';


class Family {
  private constructor(
    private readonly id: FamilyId,
    private name: FamilyName,
    private members: Member[],          // entidades hijas dentro del agregado
    private readonly createdBy: UserId,
    private readonly createdAt: Date,
  ) {}

  static create(name: FamilyName, creator: UserId): Family {
    const family = new Family(FamilyId.generate(), name, [], creator, new Date());
    family.members.push(Member.createOwner(creator));
    // dispara FamilyCreated
    return family;
  }

  inviteMember(email: EmailAddress, role: Role): Invitation {
    // invariante: no invitar a alguien que ya es miembro
    // dispara MemberInvited
  }

  removeMember(memberId: UserId, removedBy: UserId): void {
    // invariante: no se puede remover al último Owner
    // invariante: solo un Owner puede remover miembros
  }

  changeRole(memberId: UserId, newRole: Role, changedBy: UserId): void {
    // invariante: debe quedar siempre al menos un Owner
  }
}

export { Family };