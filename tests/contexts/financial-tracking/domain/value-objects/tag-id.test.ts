import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TagId } from '../../../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('TagId', () => {
  describe('generate()', () => {
    it('devuelve una instancia de TagId', () => {
      assert.ok(TagId.generate() instanceof TagId);
    });

    it('cada llamada genera un id único', () => {
      assert.ok(!TagId.generate().equals(TagId.generate()));
    });
  });

  describe('of()', () => {
    it('crea un TagId desde un UUID válido', () => {
      assert.doesNotThrow(() => TagId.of(VALID_UUID));
    });

    it('lanza InvalidTagIdError para UUID inválido', () => {
      assert.throws(() => TagId.of('not-a-uuid'), { name: 'InvalidTagIdError' });
    });

    it('lanza InvalidTagIdError para string vacío', () => {
      assert.throws(() => TagId.of(''), { name: 'InvalidTagIdError' });
    });
  });

  describe('equals()', () => {
    it('retorna true para el mismo valor', () => {
      assert.ok(TagId.of(VALID_UUID).equals(TagId.of(VALID_UUID)));
    });

    it('retorna false para valores distintos', () => {
      assert.ok(!TagId.generate().equals(TagId.generate()));
    });
  });

  describe('toString()', () => {
    it('devuelve el UUID como string', () => {
      assert.equal(TagId.of(VALID_UUID).toString(), VALID_UUID);
    });
  });
});
