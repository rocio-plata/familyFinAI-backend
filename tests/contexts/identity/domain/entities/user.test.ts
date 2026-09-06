import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EmailAddress } from "../../../../../src/contexts/family-access/domain/value-objects/email-address.js";
import { User } from "../../../../../src/contexts/identity/domain/entities/user.js";
import { UserRegistered } from "../../../../../src/contexts/identity/domain/events/user-registered.event.js";
import { DisplayName } from "../../../../../src/contexts/identity/domain/value-objects/display-name.js";
import { PasswordHash } from "../../../../../src/contexts/identity/domain/value-objects/password-hash.js";

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
    it("retorna true cuando el hash coincide", () => {
      const user = registerUser();
      assert.ok(user.verifyPassword(PasswordHash.fromStoredHash("salt:digest")));
    });

    it("retorna false cuando el hash no coincide", () => {
      const user = registerUser();
      assert.ok(!user.verifyPassword(PasswordHash.fromStoredHash("otra:cosa")));
    });
  });

  describe("changePassword()", () => {
    it("actualiza el hash de contraseña", () => {
      const user = registerUser();
      user.changePassword(PasswordHash.fromStoredHash("nueva:cosa"));
      assert.ok(user.verifyPassword(PasswordHash.fromStoredHash("nueva:cosa")));
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
