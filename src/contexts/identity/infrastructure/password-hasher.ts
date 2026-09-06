// /src/contexts/identity/infrastructure/password-hasher.ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function hashPassword(plainText: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plainText, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plainText: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidateHash = scryptSync(plainText, salt, KEY_LENGTH).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidateHash, "hex"));
}

export { hashPassword, verifyPassword };
