// tests/platform/auth/doubles/fake-jwt-service.ts

import type { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import type { JwtPayload } from "../../../../src/platform/auth/jwt.js";
import type { JwtSigner, SignOptions } from "../../../../src/platform/auth/jwt-signer.js";

class FakeJwtService implements JwtSigner {
  async sign(userId: UserId, _options?: SignOptions): Promise<string> {
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
