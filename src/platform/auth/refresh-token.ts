// platform/auth/refresh-token.ts
import { randomBytes } from "node:crypto";
import { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

interface ReconstituteRefreshTokenProps {
  value: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

class RefreshToken {
  private constructor(
    private readonly _value: string,
    private readonly _userId: UserId,
    private readonly _expiresAt: Date,
    private _revokedAt: Date | null,
  ) {}

  get value(): string {
    return this._value;
  }

  get userId(): UserId {
    return this._userId;
  }

  get expiresAtValue(): Date {
    return this._expiresAt;
  }

  static generate(userId: UserId): RefreshToken {
    const value = randomBytes(32).toString("hex");
    const expiresAt = addDays(new Date(), 30);
    return new RefreshToken(value, userId, expiresAt, null);
  }

  static reconstitute(props: ReconstituteRefreshTokenProps): RefreshToken {
    return new RefreshToken(props.value, UserId.of(props.userId), props.expiresAt, props.revokedAt);
  }

  isExpired(): boolean {
    return this._expiresAt < new Date();
  }

  isRevoked(): boolean {
    return this._revokedAt !== null;
  }

  revoke(): void {
    this._revokedAt = new Date();
  }
}

export type { ReconstituteRefreshTokenProps };
export { RefreshToken };
