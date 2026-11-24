// src/shared-kernel/domain/email-address.ts
import { InvalidEmailError } from "../errors/invalid-email.error.js";

const MAX_LENGTH = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class EmailAddress {
  private constructor(private readonly value: string) {}

  static of(value: string): EmailAddress {
    if (value.length > MAX_LENGTH || !EMAIL_REGEX.test(value)) throw new InvalidEmailError(value);
    return new EmailAddress(value.toLowerCase());
  }

  toString(): string {
    return this.value;
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }
}

export { EmailAddress };
