// scripts/generate-token.ts
// Uso: npm run token [userId]
// Genera un JWT válido firmado con el mismo secreto que usa `platform/server.ts`,
// para probar endpoints autenticados manualmente en local (ej. con curl/Postman).
import { UserId } from "../src/contexts/family-access/domain/value-objects/user-id.js";
import { JwtService } from "../src/platform/auth/jwt.js";

const secret = process.env.JWT_SECRET ?? "dev-only-insecure-secret";
const jwtService = new JwtService(new TextEncoder().encode(secret));

const rawUserId = process.argv[2];
const userId = rawUserId ? UserId.of(rawUserId) : UserId.generate();

const token = await jwtService.sign(userId);

console.log(`userId: ${userId.toString()}`);
console.log(`token:  ${token}`);
