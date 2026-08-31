import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EmailAddress } from '../../../../../src/contexts/family-access/domain/value-objects/email-address.js';

describe('EmailAddress', () => {
  describe('of()', () => {
    it('crea una instancia para un email válido', () => {
      assert.doesNotThrow(() => EmailAddress.of('user@example.com'));
    });

    it('acepta subdominios', () => {
      assert.doesNotThrow(() => EmailAddress.of('user@mail.example.com'));
    });

    it('lanza InvalidEmailError si falta el @', () => {
      assert.throws(() => EmailAddress.of('notemail'), { name: 'InvalidEmailError' });
    });

    it('lanza InvalidEmailError si falta el dominio', () => {
      assert.throws(() => EmailAddress.of('user@'), { name: 'InvalidEmailError' });
    });

    it('lanza InvalidEmailError para string vacío', () => {
      assert.throws(() => EmailAddress.of(''), { name: 'InvalidEmailError' });
    });

    it('lanza InvalidEmailError si el email tiene espacios', () => {
      assert.throws(() => EmailAddress.of('user @example.com'), { name: 'InvalidEmailError' });
    });
  });
});
