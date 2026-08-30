// platform/auth/tokens.ts
import { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";
import { JwtService } from "./jwt.js";
import { RefreshTokenRepository } from "../../contexts/family-access/domain/repositories/refresh-token.repository.js";
import { RefreshToken } from "../../contexts/family-access/domain/entities/refresh-token.js";
import { InvalidRefreshTokenError } from "../../contexts/family-access/domain/errors/invalid-refresh-token.error.js";


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

    const refreshToken = RefreshToken.generate(userId);   // valor aleatorio opaco, no un JWT
    await this.refreshTokenRepository.save(refreshToken);

    return { accessToken, refreshToken: refreshToken.value };
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const stored = await this.refreshTokenRepository.findByValue(rawRefreshToken);

    if (!stored || stored.isExpired() || stored.isRevoked()) {
      throw new InvalidRefreshTokenError();
    }

    // rotación: el refresh token usado se invalida y se emite uno nuevo
    stored.revoke();
    await this.refreshTokenRepository.save(stored);

    return this.issueTokenPair(stored.userId);
  }

  async revokeAll(userId: UserId): Promise<void> {
    // para "cerrar sesión en todos los dispositivos"
    await this.refreshTokenRepository.revokeAllForUser(userId);
  }
}