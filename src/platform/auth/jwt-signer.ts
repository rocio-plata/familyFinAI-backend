// platform/auth/jwt-signer.ts
import type { UserId } from "../../contexts/family-access/domain/value-objects/user-id.js";
import type { JwtPayload } from "./jwt.js";

interface SignOptions {
  expiresIn?: string;
}

interface JwtSigner {
  sign(userId: UserId, options?: SignOptions): Promise<string>;
  verify(token: string): Promise<JwtPayload>;
}

export type { JwtSigner, SignOptions };
