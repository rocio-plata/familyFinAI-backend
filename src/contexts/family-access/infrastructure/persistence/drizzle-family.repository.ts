// src/contexts/family-access/infrastructure/persistence/drizzle-family.repository.ts

import { eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import type { TransactionClient } from "../../../../platform/db/unit-of-work.js";
import type { Family } from "../../domain/entities/family.js";
import { Family as FamilyEntity } from "../../domain/entities/family.js";
import type { FamilyRepository } from "../../domain/repositories/family.repository.js";
import { FamilyId } from "../../domain/value-objects/family-id.js";
import type { UserId } from "../../domain/value-objects/user-id.js";
import { families, members } from "./schema.js";

class DrizzleFamilyRepository implements FamilyRepository {
  async save(family: Family, tx?: TransactionClient): Promise<void> {
    const saveFamily = async (client: TransactionClient): Promise<void> => {
      await client
        .insert(families)
        .values({
          id: family.id.toString(),
          name: family.name.toString(),
          defaultCurrency: family.defaultCurrency.toString(),
          createdBy: family.createdBy.toString(),
          createdAt: family.createdAt,
        })
        .onConflictDoUpdate({
          target: families.id,
          set: {
            name: family.name.toString(),
            defaultCurrency: family.defaultCurrency.toString(),
          },
        });

      await client.delete(members).where(eq(members.familyId, family.id.toString()));

      if (family.members.length > 0) {
        await client.insert(members).values(
          family.members.map((member) => ({
            familyId: family.id.toString(),
            userId: member.userId.toString(),
            role: member.role.isOwner() ? ("OWNER" as const) : ("MEMBER" as const),
            joinedAt: member.joinedAt,
            displayOrder: member.displayOrder,
          })),
        );
      }
    };

    if (tx) {
      await saveFamily(tx);
      return;
    }

    await db.transaction(saveFamily);
  }

  async findById(id: FamilyId, tx?: TransactionClient): Promise<Family | null> {
    const client = tx ?? db;
    const familyRows = await client
      .select()
      .from(families)
      .where(eq(families.id, id.toString()))
      .limit(1);
    const familyRow = familyRows[0];
    if (!familyRow) return null;

    const memberRows = await client
      .select()
      .from(members)
      .where(eq(members.familyId, id.toString()));

    return this.toDomain(familyRow, memberRows);
  }

  async findAllByMemberUserId(userId: UserId, tx?: TransactionClient): Promise<Family[]> {
    const client = tx ?? db;
    const rows = await client
      .select({ family: families })
      .from(families)
      .innerJoin(members, eq(members.familyId, families.id))
      .where(eq(members.userId, userId.toString()));

    const familiesById = new Map(rows.map(({ family }) => [family.id, family]));
    const reconstitutedFamilies = await Promise.all(
      [...familiesById.keys()].map((familyId) => this.findById(FamilyId.of(familyId), tx)),
    );

    return reconstitutedFamilies.filter((family): family is Family => family !== null);
  }

  private toDomain(
    familyRow: typeof families.$inferSelect,
    memberRows: (typeof members.$inferSelect)[],
  ): Family {
    return FamilyEntity.reconstitute({
      id: familyRow.id,
      name: familyRow.name,
      defaultCurrency: familyRow.defaultCurrency,
      createdBy: familyRow.createdBy,
      createdAt: familyRow.createdAt,
      members: memberRows.map((member) => this.toMemberProps(member)),
    });
  }

  private toMemberProps(member: typeof members.$inferSelect) {
    return {
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      displayOrder: member.displayOrder,
    };
  }
}

export { DrizzleFamilyRepository };
