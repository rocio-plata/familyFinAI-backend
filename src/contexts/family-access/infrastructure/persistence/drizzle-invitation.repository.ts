// src/contexts/family-access/infrastructure/persistence/drizzle-invitation.repository.ts

import { eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import { Invitation } from "../../domain/entities/invitation.js";
import type { InvitationRepository } from "../../domain/repositories/invitation.repository.js";
import type { FamilyId } from "../../domain/value-objects/family-id.js";
import type { InvitationId } from "../../domain/value-objects/invitation-id.js";
import { InvitationStatus } from "../../domain/value-objects/invitation-status.js";
import { invitations } from "./schema.js";

type InvitationRow = typeof invitations.$inferSelect;

class DrizzleInvitationRepository implements InvitationRepository {
  async save(invitation: Invitation): Promise<void> {
    await db
      .insert(invitations)
      .values({
        id: invitation.id.toString(),
        familyId: invitation.familyId.toString(),
        invitedEmail: invitation.invitedEmail.toString(),
        role: invitation.role.isOwner() ? "OWNER" : "MEMBER",
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        invitedUserId: this.getInvitedUserId(invitation),
      })
      .onConflictDoUpdate({
        target: invitations.id,
        set: {
          status: invitation.status,
          invitedUserId: this.getInvitedUserId(invitation),
        },
      });
  }

  async findById(id: InvitationId): Promise<Invitation | null> {
    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, id.toString()))
      .limit(1);
    const row = rows[0];
    return row ? this.toDomain(row) : null;
  }

  async findByFamilyId(familyId: FamilyId): Promise<Invitation[]> {
    const rows = await db
      .select()
      .from(invitations)
      .where(eq(invitations.familyId, familyId.toString()));
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: typeof invitations.$inferSelect): Invitation {
    return Invitation.reconstitute({
      id: row.id,
      familyId: row.familyId,
      invitedEmail: row.invitedEmail,
      role: row.role,
      status: this.toDomainStatus(row.status),
      expiresAt: row.expiresAt,
      invitedUserId: row.invitedUserId,
    });
  }

  private toDomainStatus(status: InvitationRow["status"]): InvitationStatus {
    switch (status) {
      case InvitationStatus.Pending:
        return InvitationStatus.Pending;
      case InvitationStatus.Accepted:
        return InvitationStatus.Accepted;
      case InvitationStatus.Expired:
        return InvitationStatus.Expired;
      case InvitationStatus.Revoked:
        return InvitationStatus.Revoked;
    }

    throw new Error(`Unknown invitation status: ${status}`);
  }

  private getInvitedUserId(invitation: Invitation): string | null {
    try {
      return invitation.invitedUserId.toString();
    } catch {
      return null;
    }
  }
}

export { DrizzleInvitationRepository };
