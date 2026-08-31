import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserId } from '../../../../../src/contexts/family-access/domain/value-objects/user-id.js';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('UserId', () => {
  describe('generate()', () => {
    it('devuelve una instancia de UserId', () => {
      const id = UserId.generate();
      assert.ok(id instanceof UserId);
    });

    it('cada llamada genera un id único', () => {
      const a = UserId.generate();
      const b = UserId.generate();
      assert.ok(!a.equals(b));
    });
  });

  describe('of()', () => {
    it('crea un UserId desde un UUID válido', () => {
      assert.doesNotThrow(() => UserId.of(VALID_UUID));
    });

    it('lanza InvalidUserIdError para UUID inválido', () => {
      assert.throws(() => UserId.of('not-a-uuid'), { name: 'InvalidUserIdError' });
    });

    it('lanza InvalidUserIdError para string vacío', () => {
      assert.throws(() => UserId.of(''), { name: 'InvalidUserIdError' });
    });
  });

  describe('equals()', () => {
    it('retorna true para el mismo valor', () => {
      const a = UserId.of(VALID_UUID);
      const b = UserId.of(VALID_UUID);
      assert.ok(a.equals(b));
    });

    it('retorna false para valores distintos', () => {
      const a = UserId.generate();
      const b = UserId.generate();
      assert.ok(!a.equals(b));
    });
  });

  describe('toString()', () => {
    it('devuelve el UUID como string', () => {
      const id = UserId.of(VALID_UUID);
      assert.equal(id.toString(), VALID_UUID);
    });
  });
});
