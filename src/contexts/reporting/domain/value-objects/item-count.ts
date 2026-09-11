// src/contexts/reporting/domain/value-objects/item-count.ts
import { InvalidItemCountError } from "../errors/invalid-item-count.error.js";

class ItemCount {
  private constructor(readonly value: number) {}

  static zero(): ItemCount {
    return new ItemCount(0);
  }

  static of(value: number): ItemCount {
    if (!Number.isInteger(value) || value < 0) {
      throw new InvalidItemCountError();
    }
    return new ItemCount(value);
  }

  increment(): ItemCount {
    return new ItemCount(this.value + 1);
  }

  decrement(): ItemCount {
    if (this.value === 0) {
      throw new InvalidItemCountError();
    }
    return new ItemCount(this.value - 1);
  }
}

export { ItemCount };
