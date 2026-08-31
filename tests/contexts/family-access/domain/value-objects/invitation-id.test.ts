import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InvitationId } from '../../../../../src/contexts/family-access/domain/value-objects/invitation-id.js';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('InvitationId', () => {
  describe('generate()', () => {
    it('devuelve una instancia de InvitationId', () => {
      const id = InvitationId.generate();
      assert.ok(id instanceof InvitationId);
    });

    it('cada llamada genera un id único', () => {
      const a = InvitationId.generate();
      const b = InvitationId.generate();
      assert.ok(!a.equals(b));
    });
  });

  describe('of()', () => {
    it('crea un InvitationId desde un UUID válido', () => {
      assert.doesNotThrow(() => InvitationId.of(VALID_UUID));
    });

    it('lanza InvalidInvitationIdError para UUID inválido', () => {
      assert.throws(() => InvitationId.of('not-a-uuid'), { name: 'InvalidInvitationIdError' });
    });

    it('lanza InvalidInvitationIdError para string vacío', () => {
      assert.throws(() => InvitationId.of(''), { name: 'InvalidInvitationIdError' });
    });
  });

  describe('equals()', () => {
    it('retorna true para el mismo valor', () => {
      const a = InvitationId.of(VALID_UUID);
      const b = InvitationId.of(VALID_UUID);
      assert.ok(a.equals(b));
    });

    it('retorna false para valores distintos', () => {
      const a = InvitationId.generate();
      const b = InvitationId.generate();
      assert.ok(!a.equals(b));
    });
  });

  describe('toString()', () => {
    it('devuelve el UUID como string', () => {
      const id = InvitationId.of(VALID_UUID);
      assert.equal(id.toString(), VALID_UUID);
    });
  });
});
