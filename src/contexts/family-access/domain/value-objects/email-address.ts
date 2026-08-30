// src/contexts/family-access/domain/value-objects/email-address.ts
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class EmailAddress {
  private constructor(private readonly value: string) {}
  static of(value: string): EmailAddress {
    if (!EMAIL_REGEX.test(value)) throw new InvalidEmailError();
    return new EmailAddress(value.toLowerCase());
  }
}

export { EmailAddress };