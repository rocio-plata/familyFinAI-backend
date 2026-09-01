import { randomBytes } from "crypto";
import type { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";

class RefreshToken {
  private constructor(
    private readonly value: string, // string aleatorio, no JWT — ej. crypto.randomBytes(32).toString("hex")
    private readonly userId: UserId,
    private readonly expiresAt: Date,
    private revokedAt: Date | null,
  ) {}

  static generate(userId: UserId): RefreshToken {
    const value = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    return new RefreshToken(value, userId, expiresAt, null);
  }

  isExpired(): boolean {
    return this.expiresAt < new Date();
  }
  isRevoked(): boolean {
    return this.revokedAt !== null;
  }
  revoke(): void {
    this.revokedAt = new Date();
  }
}
