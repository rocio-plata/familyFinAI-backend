// contexts/financial-tracking/domain/value-objects/transaction-date.ts

import { FutureTransactionDateError } from "../errors/future-transaction-date.error.js";

class TransactionDate {
  private constructor(private readonly value: Date) {}

  static of(date: Date): TransactionDate {
    if (date > new Date()) throw new FutureTransactionDateError(); // regla de negocio a decidir
    return new TransactionDate(date);
  }
}

export { TransactionDate };
