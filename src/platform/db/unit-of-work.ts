// src/platform/db/unit-of-work.ts

import { db } from "./connection.js";

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface UnitOfWork {
  run<T>(work: (tx?: TransactionClient) => Promise<T>): Promise<T>;
}

class DrizzleUnitOfWork implements UnitOfWork {
  async run<T>(work: (tx?: TransactionClient) => Promise<T>): Promise<T> {
    return db.transaction(work);
  }
}

class DirectUnitOfWork implements UnitOfWork {
  async run<T>(work: (tx?: TransactionClient) => Promise<T>): Promise<T> {
    return work();
  }
}

export type { TransactionClient, UnitOfWork };
export { DirectUnitOfWork, DrizzleUnitOfWork };
