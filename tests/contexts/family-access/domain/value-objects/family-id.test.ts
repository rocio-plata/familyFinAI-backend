import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FamilyId } from '../../../../../src/contexts/family-access/domain/value-objects/family-id.js';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('FamilyId', () => {
  describe('generate()', () => {
    it('devuelve una instancia de FamilyId', () => {
      const id = FamilyId.generate();
      assert.ok(id instanceof FamilyId);
    });

    it('cada llamada genera un id único', () => {
      const a = FamilyId.generate();
      const b = FamilyId.generate();
      assert.ok(!a.equals(b));
    });
  });

  describe('of()', () => {
    it('crea un FamilyId desde un UUID válido', () => {
      assert.doesNotThrow(() => FamilyId.of(VALID_UUID));
    });

    it('lanza InvalidFamilyIdError para un UUID inválido', () => {
      assert.throws(() => FamilyId.of('not-a-uuid'), { name: 'InvalidFamilyIdError' });
    });

    it('lanza InvalidFamilyIdError para string vacío', () => {
      assert.throws(() => FamilyId.of(''), { name: 'InvalidFamilyIdError' });
    });
  });

  describe('equals()', () => {
    it('retorna true para el mismo valor', () => {
      const a = FamilyId.of(VALID_UUID);
      const b = FamilyId.of(VALID_UUID);
      assert.ok(a.equals(b));
    });

    it('retorna false para valores distintos', () => {
      const a = FamilyId.generate();
      const b = FamilyId.generate();
      assert.ok(!a.equals(b));
    });
  });

  describe('toString()', () => {
    it('devuelve el UUID como string', () => {
      const id = FamilyId.of(VALID_UUID);
      assert.equal(id.toString(), VALID_UUID);
    });
  });
});
