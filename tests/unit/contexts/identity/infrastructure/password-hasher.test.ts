import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashPassword,
  verifyPassword,
} from "../../../../src/contexts/identity/infrastructure/password-hasher.js";

describe("password-hasher", () => {
  it("verifyPassword retorna true para la contraseña correcta", () => {
    const stored = hashPassword("supersecreta");
    assert.ok(verifyPassword("supersecreta", stored));
  });

  it("verifyPassword retorna false para una contraseña incorrecta", () => {
    const stored = hashPassword("supersecreta");
    assert.ok(!verifyPassword("otra-contraseña", stored));
  });

  it("hashPassword genera un salt distinto en cada llamada", () => {
    const a = hashPassword("supersecreta");
    const b = hashPassword("supersecreta");
    assert.notEqual(a, b);
  });
});
