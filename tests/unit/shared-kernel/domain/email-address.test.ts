// tests/shared-kernel/domain/email-address.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { EmailAddress } from "../../../src/shared-kernel/domain/email-address.js";
import { InvalidEmailError } from "../../../src/shared-kernel/errors/invalid-email.error.js";

describe("EmailAddress", () => {
  test("normaliza la dirección a minúsculas", () => {
    assert.equal(EmailAddress.of("Rocio@Test.com").toString(), "rocio@test.com");
  });

  test("rechaza direcciones inválidas", () => {
    assert.throws(() => EmailAddress.of("notemail"), InvalidEmailError);
    assert.throws(() => EmailAddress.of("user@"), InvalidEmailError);
    assert.throws(() => EmailAddress.of(""), InvalidEmailError);
    assert.throws(() => EmailAddress.of("user @example.com"), InvalidEmailError);
  });

  test("compara direcciones normalizadas", () => {
    assert.ok(EmailAddress.of("rocio@test.com").equals(EmailAddress.of("ROCIO@test.com")));
  });
});
