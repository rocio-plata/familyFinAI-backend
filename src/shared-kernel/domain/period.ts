// src/shared-kernel/domain/period.ts
import { InvalidPeriodError } from "../errors/invalid-period.error.js";

class Period {
  private constructor(
    private readonly year: number,
    private readonly month: number,
  ) {}

  static of(year: number, month: number): Period {
    if (
      !Number.isInteger(year) ||
      year < 1 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      throw new InvalidPeriodError(year, month);
    }
    return new Period(year, month);
  }

  static current(): Period {
    return Period.fromDate(new Date());
  }

  static fromDate(date: Date): Period {
    return Period.of(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }

  toString(): string {
    return `${this.year}-${this.month.toString().padStart(2, "0")}`;
  }

  equals(other: Period): boolean {
    return this.year === other.year && this.month === other.month;
  }

  isAfter(other: Period): boolean {
    return this.year > other.year || (this.year === other.year && this.month > other.month);
  }

  next(): Period {
    return this.month === 12 ? Period.of(this.year + 1, 1) : Period.of(this.year, this.month + 1);
  }
}

export { Period };
