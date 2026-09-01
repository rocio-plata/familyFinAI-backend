// contexts/financial-tracking/domain/value-objects/transaction-date.ts

import { FutureTransactionDateError } from "../errors/future-transaction-date.error.js";

class TransactionDate {
  private constructor(readonly value: Date) {}

  static of(date: Date): TransactionDate {
    if (date > new Date()) throw new FutureTransactionDateError();
    return new TransactionDate(date);
  }

  equals(other: TransactionDate): boolean {
    return this.value.getTime() === other.value.getTime();
  }
}

export { TransactionDate };
