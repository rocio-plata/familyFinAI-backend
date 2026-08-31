import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TransactionDate } from '../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js';

describe('TransactionDate', () => {
  it('crea una instancia para una fecha pasada', () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    assert.doesNotThrow(() => TransactionDate.of(yesterday));
  });

  it('crea una instancia para fecha reciente (casi ahora)', () => {
    const almostNow = new Date(Date.now() - 1);
    assert.doesNotThrow(() => TransactionDate.of(almostNow));
  });

  it('lanza FutureTransactionDateError para una fecha futura', () => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    assert.throws(() => TransactionDate.of(tomorrow), { name: 'FutureTransactionDateError' });
  });
});
