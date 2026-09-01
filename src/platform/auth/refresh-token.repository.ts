// platform/auth/refresh-token.repository.ts

import type { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";
import type { RefreshToken } from "./refresh-token.js";

interface RefreshTokenRepository {
  save(token: RefreshToken): Promise<void>;
  findByValue(value: string): Promise<RefreshToken | null>;
  revokeAllForUser(userId: UserId): Promise<void>;
}

export type { RefreshTokenRepository };
