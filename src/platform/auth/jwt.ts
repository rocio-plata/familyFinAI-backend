// platform/auth/jwt.ts
import { jwtVerify, SignJWT } from "jose";
import type { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

interface SignOptions {
  expiresIn?: string;
}

class JwtService {
  constructor(private readonly secret: Uint8Array) {}

  async sign(userId: UserId, options?: SignOptions): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId.toString())
      .setIssuedAt()
      .setExpirationTime(options?.expiresIn ?? "15m")
      .sign(this.secret);
  }

  async verify(token: string): Promise<JwtPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    return payload as unknown as JwtPayload;
  }
}

export type { JwtPayload };
export { JwtService };
