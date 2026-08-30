// platform/auth/jwt.ts
import { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";
import { SignJWT, jwtVerify } from "jose";

interface JwtPayload {
  sub: string;        // UserId
  email: string;
  iat: number;
  exp: number;
}

class JwtService {
  constructor(private readonly secret: Uint8Array) {}

  async sign(userId: UserId, email: string): Promise<string> {
    return new SignJWT({ email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId.toString())
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(this.secret);
  }

  async verify(token: string): Promise<JwtPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    return payload as unknown as JwtPayload;
  }
}

export const jwtService = new JwtService(new TextEncoder().encode(process.env.JWT_SECRET || "default_secret"));