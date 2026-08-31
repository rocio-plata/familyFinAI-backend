import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CategoryAssignment } from '../../../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js';
import { CategoryId } from '../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js';
import { TagId } from '../../../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js';

const UUID_A = '123e4567-e89b-12d3-a456-426614174000';
const UUID_B = '223e4567-e89b-12d3-a456-426614174000';

describe('CategoryAssignment', () => {
  it('crea asignación con tag', () => {
    const catId = CategoryId.of(UUID_A);
    const tagId = TagId.of(UUID_B);
    const assignment = CategoryAssignment.of(catId, tagId);
    assert.ok(assignment.categoryId.equals(catId));
    assert.ok(assignment.tagId?.equals(tagId));
  });

  it('crea asignación sin tag (null explícito)', () => {
    const assignment = CategoryAssignment.of(CategoryId.of(UUID_A), null);
    assert.equal(assignment.tagId, null);
  });

  it('crea asignación sin tag por defecto', () => {
    const assignment = CategoryAssignment.of(CategoryId.of(UUID_A));
    assert.equal(assignment.tagId, null);
  });

  describe('equals()', () => {
    it('retorna true para misma categoría y mismo tag', () => {
      const catId = CategoryId.of(UUID_A);
      const tagId = TagId.of(UUID_B);
      assert.ok(CategoryAssignment.of(catId, tagId).equals(CategoryAssignment.of(catId, tagId)));
    });

    it('retorna true cuando ambos tags son null', () => {
      const catId = CategoryId.of(UUID_A);
      assert.ok(CategoryAssignment.of(catId, null).equals(CategoryAssignment.of(catId, null)));
    });

    it('retorna false para categorías distintas', () => {
      const a = CategoryAssignment.of(CategoryId.of(UUID_A), null);
      const b = CategoryAssignment.of(CategoryId.of(UUID_B), null);
      assert.ok(!a.equals(b));
    });

    it('retorna false cuando uno tiene tag y el otro no', () => {
      const catId = CategoryId.of(UUID_A);
      const a = CategoryAssignment.of(catId, TagId.of(UUID_B));
      const b = CategoryAssignment.of(catId, null);
      assert.ok(!a.equals(b));
    });
  });
});
