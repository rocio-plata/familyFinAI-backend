import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TagName } from '../../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js';

describe('TagName', () => {
  it('crea una instancia para nombre válido', () => {
    assert.doesNotThrow(() => TagName.of('Supermercado'));
  });

  it('elimina espacios al inicio y final', () => {
    assert.equal(TagName.of('  Supermercado  ').toString(), 'Supermercado');
  });

  it('lanza InvalidTagNameError para string vacío', () => {
    assert.throws(() => TagName.of(''), { name: 'InvalidTagNameError' });
  });

  it('lanza InvalidTagNameError para string solo con espacios', () => {
    assert.throws(() => TagName.of('   '), { name: 'InvalidTagNameError' });
  });

  it('lanza InvalidTagNameError para nombre mayor a 30 caracteres', () => {
    assert.throws(() => TagName.of('a'.repeat(31)), { name: 'InvalidTagNameError' });
  });

  it('acepta nombre de exactamente 30 caracteres', () => {
    assert.doesNotThrow(() => TagName.of('a'.repeat(30)));
  });

  it('equals() es case-insensitive', () => {
    assert.ok(TagName.of('Supermercado').equals(TagName.of('supermercado')));
  });

  it('equals() retorna false para nombres distintos', () => {
    assert.ok(!TagName.of('Supermercado').equals(TagName.of('Farmacia')));
  });
});
