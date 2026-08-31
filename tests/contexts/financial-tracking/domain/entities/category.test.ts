import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Category } from '../../../../../src/contexts/financial-tracking/domain/entities/category.js';
import { FamilyId } from '../../../../../src/contexts/family-access/domain/value-objects/family-id.js';
import { CategoryName } from '../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js';
import { TagName } from '../../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js';
import { CategoryStatus } from '../../../../../src/contexts/financial-tracking/domain/value-objects/category-status.js';

describe('Category', () => {
  const familyId = FamilyId.generate();
  const catName = CategoryName.of('Alimentación');

  describe('create()', () => {
    it('crea una categoría activa', () => {
      assert.equal(Category.create(familyId, catName).status, CategoryStatus.Active);
    });

    it('inicia sin tags', () => {
      assert.equal(Category.create(familyId, catName).tags.length, 0);
    });

    it('asigna el familyId', () => {
      assert.ok(Category.create(familyId, catName).familyId.equals(familyId));
    });

    it('genera un id único por cada categoría', () => {
      assert.ok(!Category.create(familyId, catName).id.equals(Category.create(familyId, catName).id));
    });
  });

  describe('addTag()', () => {
    it('agrega un tag a la categoría', () => {
      const cat = Category.create(familyId, catName);
      cat.addTag(TagName.of('Supermercado'));
      assert.equal(cat.tags.length, 1);
    });

    it('asigna displayOrder incremental a cada tag', () => {
      const cat = Category.create(familyId, catName);
      cat.addTag(TagName.of('Supermercado'));
      cat.addTag(TagName.of('Farmacia'));
      assert.equal(cat.tags[0]?.displayOrder, 0);
      assert.equal(cat.tags[1]?.displayOrder, 1);
    });
  });

  describe('rename()', () => {
    it('actualiza el nombre de la categoría', () => {
      const cat = Category.create(familyId, catName);
      const newName = CategoryName.of('Transporte');
      cat.rename(newName);
      assert.ok(cat.name.equals(newName));
    });
  });

  describe('deprecate()', () => {
    it('cambia el estado a Deprecated', () => {
      const cat = Category.create(familyId, catName);
      cat.deprecate();
      assert.equal(cat.status, CategoryStatus.Deprecated);
    });
  });

  describe('reactivate()', () => {
    it('vuelve el estado a Active', () => {
      const cat = Category.create(familyId, catName);
      cat.deprecate();
      cat.reactivate();
      assert.equal(cat.status, CategoryStatus.Active);
    });
  });
});
