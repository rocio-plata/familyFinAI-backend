// /src/contexts/family-access/infrastructure/persistence/in-memory-invitation.repository.ts
import type { Invitation } from "../../domain/entities/invitation.js";
import type { InvitationRepository } from "../../domain/repositories/invitation.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { InvitationId } from "../../domain/value-objects/invitation-id.js";

class InMemoryInvitationRepository implements InvitationRepository {
  private readonly invitations = new Map<string, Invitation>();

  async save(invitation: Invitation): Promise<void> {
    this.invitations.set(invitation.id.toString(), invitation);
  }

  async findById(id: InvitationId): Promise<Invitation | null> {
    return this.invitations.get(id.toString()) ?? null;
  }

  async findByFamilyId(familyId: FamilyId): Promise<Invitation[]> {
    return [...this.invitations.values()].filter((invitation) =>
      invitation.familyId.equals(familyId),
    );
  }
}

export { InMemoryInvitationRepository };
