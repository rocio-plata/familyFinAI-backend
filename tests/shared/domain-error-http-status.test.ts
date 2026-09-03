// tests/shared/domain-error-http-status.test.ts

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveHttpStatus } from "../../src/platform/http/domain-error-http-status.js";

describe("resolveHttpStatus", () => {
  test("errores *_NOT_FOUND devuelven 404", () => {
    assert.equal(resolveHttpStatus({ code: "FAMILY_ACCESS.FAMILY_NOT_FOUND" }), 404);
    assert.equal(resolveHttpStatus({ code: "FINANCIAL_TRACKING.CATEGORY_NOT_FOUND" }), 404);
  });

  test("errores de conflicto (duplicados, asociaciones existentes) devuelven 409", () => {
    assert.equal(resolveHttpStatus({ code: "FAMILY_ACCESS.ALREADY_MEMBER" }), 409);
    assert.equal(
      resolveHttpStatus({ code: "FINANCIAL_TRACKING.CATEGORY_HAS_ASSOCIATED_ITEMS" }),
      409,
    );
    assert.equal(resolveHttpStatus({ code: "FINANCIAL_TRACKING.DUPLICATE_CATEGORY_NAME" }), 409);
  });

  test("errores de permisos insuficientes devuelven 403", () => {
    assert.equal(resolveHttpStatus({ code: "FAMILY_ACCESS.INSUFFICIENT_ROLE" }), 403);
  });

  test("errores de autenticación devuelven 401", () => {
    assert.equal(resolveHttpStatus({ code: "AUTH.INVALID_REFRESH_TOKEN" }), 401);
    assert.equal(resolveHttpStatus({ code: "AUTH.POSSIBLE_TOKEN_THEFT" }), 401);
  });

  test("cualquier otro error de dominio devuelve 400 por defecto", () => {
    assert.equal(resolveHttpStatus({ code: "FINANCIAL_TRACKING.INVALID_MONEY" }), 400);
    assert.equal(resolveHttpStatus({ code: "FAMILY_ACCESS.CANNOT_REMOVE_LAST_OWNER" }), 400);
  });
});
