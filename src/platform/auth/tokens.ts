// platform/auth/tokens.ts

import type { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";
import { InvalidRefreshTokenError } from "./errors/invalid-refresh-token.error.js";
import { PossibleTokenTheftError } from "./errors/possible-token-theft.error.js";
import type { JwtService } from "./jwt.js";
import { RefreshToken } from "./refresh-token.js";
import type { RefreshTokenRepository } from "./refresh-token.repository.js";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async issueTokenPair(userId: UserId): Promise<TokenPair> {
    const accessToken = await this.jwtService.sign(userId, { expiresIn: "15m" });

    const refreshToken = RefreshToken.generate(userId);
    await this.refreshTokenRepository.save(refreshToken);

    return { accessToken, refreshToken: refreshToken.value };
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const stored = await this.refreshTokenRepository.findByValue(rawRefreshToken);

    if (!stored) {
      throw new InvalidRefreshTokenError();
    }

    if (stored.isRevoked()) {
      // el token ya había sido rotado antes — esto es un reuso, señal de robo
      await this.refreshTokenRepository.revokeAllForUser(stored.userId);
      throw new PossibleTokenTheftError();
    }

    if (stored.isExpired()) {
      throw new InvalidRefreshTokenError();
    }

    // rotación normal: el token usado se invalida y se emite uno nuevo
    stored.revoke();
    await this.refreshTokenRepository.save(stored);

    return this.issueTokenPair(stored.userId);
  }

  async revokeAll(userId: UserId): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }
}

export type { TokenPair };
export { TokenService };
