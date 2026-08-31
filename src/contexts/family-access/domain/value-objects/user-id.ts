// src/contexts/family-access/domain/value-objects/user-id.ts
import { randomUUID } from "node:crypto";
import { isValidUUID } from "../../../../shared-kernel/domain/uuid.js";
import { InvalidUserIdError } from "../errors/invalid-user-id-error.js";

class UserId {
  private constructor(private readonly value: string) {}

  static generate(): UserId {
    return new UserId(randomUUID());
  }

  static of(value: string): UserId {
    if (!isValidUUID(value)) throw new InvalidUserIdError(value);
    return new UserId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}

export { UserId };
