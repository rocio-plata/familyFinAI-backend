// /src/platform/auth/persistence/in-memory-refresh-token.repository.ts
import type { UserId } from "../../../contexts/family-access/domain/value-objects/user-id.js";
import type { RefreshToken } from "../refresh-token.js";
import type { RefreshTokenRepository } from "../refresh-token.repository.js";

class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly tokens = new Map<string, RefreshToken>();

  async save(token: RefreshToken): Promise<void> {
    this.tokens.set(token.value, token);
  }

  async findByValue(value: string): Promise<RefreshToken | null> {
    return this.tokens.get(value) ?? null;
  }

  async revokeAllForUser(userId: UserId): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.userId.equals(userId) && !token.isRevoked()) {
        token.revoke();
      }
    }
  }
}

export { InMemoryRefreshTokenRepository };
