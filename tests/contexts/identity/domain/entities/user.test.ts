// tests/contexts/identity/domain/entities/user.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { User } from "../../../../../src/contexts/identity/domain/entities/user.js";
import { UserRegistered } from "../../../../../src/contexts/identity/domain/events/user-registered.event.js";
import { DisplayName } from "../../../../../src/contexts/identity/domain/value-objects/display-name.js";
import { PasswordHash } from "../../../../../src/contexts/identity/domain/value-objects/password-hash.js";
import { EmailAddress } from "../../../../../src/shared-kernel/domain/email-address.js";

function registerUser() {
  return User.register(
    EmailAddress.of("rocio@test.com"),
    PasswordHash.fromStoredHash("salt:digest"),
    DisplayName.of("Rocío"),
  );
}

describe("User", () => {
  describe("register()", () => {
    it("almacena el email y el nombre a mostrar", () => {
      const user = registerUser();
      assert.equal(user.email.toString(), "rocio@test.com");
      assert.equal(user.displayName.toString(), "Rocío");
    });

    it("dispara el evento UserRegistered", () => {
      const user = registerUser();
      const events = user.pullDomainEvents();
      assert.equal(events.length, 1);
      assert.ok(events[0] instanceof UserRegistered);
    });

    it("pullDomainEvents() vacía la lista de eventos pendientes", () => {
      const user = registerUser();
      user.pullDomainEvents();
      assert.deepEqual(user.pullDomainEvents(), []);
    });
  });

  describe("verifyPassword()", () => {
    it("retorna true cuando la función de verificación confirma el match", () => {
      const user = registerUser();
      assert.ok(user.verifyPassword("cualquier-texto", () => true));
    });

    it("retorna false cuando la función de verificación no confirma el match", () => {
      const user = registerUser();
      assert.ok(!user.verifyPassword("cualquier-texto", () => false));
    });

    it("le pasa el texto plano y el hash almacenado a la función de verificación", () => {
      const user = registerUser();
      let received: [string, string] | null = null;
      user.verifyPassword("supersecreta", (plainText, storedHash) => {
        received = [plainText, storedHash];
        return true;
      });
      assert.deepEqual(received, ["supersecreta", "salt:digest"]);
    });
  });

  describe("changePassword()", () => {
    it("actualiza el hash de contraseña", () => {
      const user = registerUser();
      user.changePassword(PasswordHash.fromStoredHash("nueva:cosa"));
      assert.ok(
        user.verifyPassword("cualquier-texto", (_p, storedHash) => storedHash === "nueva:cosa"),
      );
    });
  });

  describe("updateDisplayName()", () => {
    it("actualiza el nombre a mostrar", () => {
      const user = registerUser();
      user.updateDisplayName(DisplayName.of("Ana"));
      assert.equal(user.displayName.toString(), "Ana");
    });
  });
});
