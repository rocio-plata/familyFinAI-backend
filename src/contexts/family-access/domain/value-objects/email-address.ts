// src/contexts/family-access/domain/value-objects/email-address.ts
import { InvalidEmailError } from "../errors/invalid-email.error.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class EmailAddress {
  private constructor(private readonly value: string) {}
  static of(value: string): EmailAddress {
    if (!EMAIL_REGEX.test(value)) throw new InvalidEmailError(value);
    return new EmailAddress(value.toLowerCase());
  }
}

export { EmailAddress };
