// platform/auth/refresh-token.ts
import { randomBytes } from "node:crypto";
import type { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

class RefreshToken {
  private constructor(
    private readonly _value: string,
    private readonly _userId: UserId,
    private readonly expiresAt: Date,
    private revokedAt: Date | null,
  ) {}

  get value(): string {
    return this._value;
  }

  get userId(): UserId {
    return this._userId;
  }

  static generate(userId: UserId): RefreshToken {
    const value = randomBytes(32).toString("hex");
    const expiresAt = addDays(new Date(), 30);
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

export { RefreshToken };
