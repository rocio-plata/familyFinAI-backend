// src/contexts/family-access/domain/value-objects/invitation-id.ts
import { randomUUID } from "node:crypto";
import { isValidUUID } from "../../../../shared-kernel/domain/uuid.js";
import { InvalidInvitationIdError } from "../errors/invalid-invitation-id.error.js";

class InvitationId {
  private constructor(private readonly value: string) {}

  static generate(): InvitationId {
    return new InvitationId(randomUUID());
  }

  static of(value: string): InvitationId {
    if (!isValidUUID(value)) throw new InvalidInvitationIdError(value);
    return new InvitationId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: InvitationId): boolean {
    return this.value === other.value;
  }
}

export { InvitationId };
