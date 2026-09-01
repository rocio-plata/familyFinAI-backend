// tests/platform/auth/doubles/fake-jwt-service.ts

import type { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import type { JwtPayload, JwtService } from "../../../../src/platform/auth/jwt.js";

class FakeJwtService implements Pick<JwtService, "sign" | "verify"> {
  async sign(userId: UserId): Promise<string> {
    // token "falso" pero determinístico, suficiente para tests — no valida criptografía real
    return `fake-jwt.${userId.toString()}`;
  }

  async verify(token: string): Promise<JwtPayload> {
    const [, sub] = token.split(".");
    if (!sub) throw new Error("Invalid fake token");
    return { sub, iat: Date.now(), exp: Date.now() + 900_000 };
  }
}

export { FakeJwtService };
