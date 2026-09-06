// tests/contexts/identity/domain/value-objects/password-hash.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WeakPasswordError } from "../../../../../src/contexts/identity/domain/errors/weak-password.error.js";
import { PasswordHash } from "../../../../../src/contexts/identity/domain/value-objects/password-hash.js";

describe("PasswordHash", () => {
  it("fromPlainText delega el hasheo en la función recibida", () => {
    const hash = PasswordHash.fromPlainText("supersecreta", (plainText) => `hashed:${plainText}`);
    assert.equal(hash.toString(), "hashed:supersecreta");
  });

  it("fromPlainText rechaza una contraseña más corta que el mínimo", () => {
    assert.throws(
      () => PasswordHash.fromPlainText("corta12", (plainText) => plainText),
      WeakPasswordError,
    );
  });

  it("fromStoredHash reconstruye sin volver a hashear", () => {
    const hash = PasswordHash.fromStoredHash("salt:digest");
    assert.equal(hash.toString(), "salt:digest");
  });

  it("equals() compara por valor", () => {
    const a = PasswordHash.fromStoredHash("salt:digest");
    const b = PasswordHash.fromStoredHash("salt:digest");
    const c = PasswordHash.fromStoredHash("otra:cosa");
    assert.ok(a.equals(b));
    assert.ok(!a.equals(c));
  });

  it("matches() delega la verificación en la función recibida", () => {
    const hash = PasswordHash.fromStoredHash("salt:digest");
    const verifyOk = (plainText: string, storedHash: string) =>
      plainText === "supersecreta" && storedHash === "salt:digest";

    assert.ok(hash.matches("supersecreta", verifyOk));
    assert.ok(!hash.matches("otra-contraseña", verifyOk));
  });
});
