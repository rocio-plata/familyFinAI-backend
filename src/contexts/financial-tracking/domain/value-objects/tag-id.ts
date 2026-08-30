// contexts/financial-tracking/domain/value-objects/tag-id.ts
import { randomUUID } from "node:crypto";
import { isValidUUID } from "../../../../shared-kernel/domain/uuid.js";

class TagId {
  private constructor(private readonly value: string) {}

  static generate(): TagId {
    return new TagId(randomUUID());
  }

  static of(value: string): TagId {
    if (!isValidUUID(value)) throw new InvalidTagIdError(value);
    return new TagId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: TagId): boolean {
    return this.value === other.value;
  }
}

export { TagId };