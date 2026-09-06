// /src/contexts/identity/domain/value-objects/password-hash.ts
import { WeakPasswordError } from "../errors/weak-password.error.js";

const MIN_PASSWORD_LENGTH = 8;

class PasswordHash {
  private constructor(private readonly value: string) {}

  // recibe el hash ya calculado — el hasheo concreto (scrypt) es un detalle de infraestructura
  static fromPlainText(plainText: string, hash: (plainText: string) => string): PasswordHash {
    if (plainText.length < MIN_PASSWORD_LENGTH) {
      throw new WeakPasswordError();
    }
    return new PasswordHash(hash(plainText));
  }

  static fromStoredHash(hash: string): PasswordHash {
    return new PasswordHash(hash);
  }

  equals(other: PasswordHash): boolean {
    return this.value === other.value;
  }

  // delega en la función de verificación real (ej. scrypt), que sabe extraer el salt del hash almacenado
  matches(plainText: string, verify: (plainText: string, storedHash: string) => boolean): boolean {
    return verify(plainText, this.value);
  }

  toString(): string {
    return this.value;
  }
}

export { MIN_PASSWORD_LENGTH, PasswordHash };
