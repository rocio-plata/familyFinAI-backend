import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FinancialItemId } from '../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('FinancialItemId', () => {
  describe('generate()', () => {
    it('devuelve una instancia de FinancialItemId', () => {
      assert.ok(FinancialItemId.generate() instanceof FinancialItemId);
    });

    it('cada llamada genera un id único', () => {
      assert.ok(!FinancialItemId.generate().equals(FinancialItemId.generate()));
    });
  });

  describe('of()', () => {
    it('crea desde un UUID válido', () => {
      assert.doesNotThrow(() => FinancialItemId.of(VALID_UUID));
    });

    it('lanza InvalidFinancialItemIdError para UUID inválido', () => {
      assert.throws(() => FinancialItemId.of('not-a-uuid'), { name: 'InvalidFinancialItemIdError' });
    });

    it('lanza InvalidFinancialItemIdError para string vacío', () => {
      assert.throws(() => FinancialItemId.of(''), { name: 'InvalidFinancialItemIdError' });
    });
  });

  describe('equals()', () => {
    it('retorna true para el mismo valor', () => {
      assert.ok(FinancialItemId.of(VALID_UUID).equals(FinancialItemId.of(VALID_UUID)));
    });

    it('retorna false para valores distintos', () => {
      assert.ok(!FinancialItemId.generate().equals(FinancialItemId.generate()));
    });
  });

  describe('toString()', () => {
    it('devuelve el UUID como string', () => {
      assert.equal(FinancialItemId.of(VALID_UUID).toString(), VALID_UUID);
    });
  });
});
