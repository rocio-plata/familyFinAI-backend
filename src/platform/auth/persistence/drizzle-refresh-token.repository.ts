// platform/auth/persistence/drizzle-refresh-token.repository.ts
import { and, eq } from "drizzle-orm";
import type { UserId } from "../../../contexts/family-access/domain/value-objects/user-id.js";
import { db } from "../../../platform/db/connection.js";
import { RefreshToken } from "../refresh-token.js";
import type { RefreshTokenRepository } from "../refresh-token.repository.js";
import { refreshTokens } from "../schema.js";

class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  async save(token: RefreshToken): Promise<void> {
    await db
      .insert(refreshTokens)
      .values({
        value: token.value,
        userId: token.userId.toString(),
        expiresAt: token.expiresAtValue, // ver nota, mismo caso que passwordHashValue
        revokedAt: token.isRevoked() ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: refreshTokens.value,
        set: { revokedAt: token.isRevoked() ? new Date() : null },
      });
  }

  async findByValue(value: string): Promise<RefreshToken | null> {
    const row = await db.query.refreshTokens.findFirst({ where: eq(refreshTokens.value, value) });
    if (!row) return null;

    return RefreshToken.reconstitute({
      value: row.value,
      userId: row.userId,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
    });
  }

  async revokeAllForUser(userId: UserId): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId.toString())));
  }
}

export { DrizzleRefreshTokenRepository };
