// tests/platform/auth/tokens.test.ts

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { InvalidRefreshTokenError } from "../../../src/platform/auth/errors/invalid-refresh-token.error.js";
import { PossibleTokenTheftError } from "../../../src/platform/auth/errors/possible-token-theft.error.js";
import { TokenService } from "../../../src/platform/auth/tokens.js";
import { FakeJwtService } from "./doubles/fake-jwt-service.js";
import { InMemoryRefreshTokenRepository } from "./doubles/in-memory-refresh-token.repository.js";

describe("TokenService.refresh", () => {
  let repository: InMemoryRefreshTokenRepository;
  let tokenService: TokenService;
  let userId: UserId;

  beforeEach(() => {
    repository = new InMemoryRefreshTokenRepository();
    tokenService = new TokenService(new FakeJwtService(), repository);
    userId = UserId.generate();
  });

  test("rota el refresh token correctamente en un uso normal", async () => {
    const { refreshToken } = await tokenService.issueTokenPair(userId);

    const result = await tokenService.refresh(refreshToken);

    assert.ok(result.accessToken);
    assert.notEqual(result.refreshToken, refreshToken);
  });

  test("rechaza un token que no existe", async () => {
    await assert.rejects(() => tokenService.refresh("token-inexistente"), InvalidRefreshTokenError);
  });

  test("detecta el reuso de un token ya rotado y revoca todas las sesiones del usuario", async () => {
    const { refreshToken: firstToken } = await tokenService.issueTokenPair(userId);
    await tokenService.refresh(firstToken); // rotación normal, firstToken queda revocado

    await assert.rejects(() => tokenService.refresh(firstToken), PossibleTokenTheftError);

    // confirma que además se revocaron TODAS las sesiones, no solo la reusada
    const stillValid = await repository.findByValue(firstToken);
    assert.ok(stillValid?.isRevoked());
  });
});
