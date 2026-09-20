// tests/integration/contexts/financial-tracking/infrastructure/persistence/category.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { Category } from "../../../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryIcon } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-icon.js";
import { CategoryName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { TagName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/tag-name.js";
import { DrizzleCategoryRepository } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-category.repository.js";
import { categories } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/schema.js";
import { db } from "../../../../../../src/platform/db/connection.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const categoryRepository = new DrizzleCategoryRepository();
const createdCategoryIds: string[] = [];

after(async () => {
  if (!hasDatabase) return;
  for (const id of createdCategoryIds) {
    await db.delete(categories).where(eq(categories.id, id));
  }
});

describe("Persistencia Drizzle de categorías (integración)", () => {
  test("guarda una categoría con tags y la recupera con sus tags", { skip }, async () => {
    const familyId = FamilyId.generate();
    const category = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Alimentación integración"),
      CategoryIcon.of("shopping_cart"),
    );
    category.addTag(TagName.of("Supermercado"));
    createdCategoryIds.push(category.id.toString());

    await categoryRepository.save(category);

    const found = await categoryRepository.findById(category.id);
    assert.ok(found);
    assert.equal(found.name.toString(), "Alimentación integración");
    assert.equal(found.icon?.toString(), "shopping_cart");
    assert.equal(found.tags.length, 1);
    assert.equal(found.tags[0]?.name.toString(), "Supermercado");

    const byFamily = await categoryRepository.findByFamilyId(familyId);
    assert.equal(byFamily.length, 1);
    assert.equal(byFamily[0]?.icon?.toString(), "shopping_cart");
  });

  test("actualiza el ícono de una categoría existente", { skip }, async () => {
    const category = Category.create(
      FamilyId.generate(),
      FinancialItemType.Expense,
      CategoryName.of("Compras integración"),
      CategoryIcon.of("shopping_cart"),
    );
    createdCategoryIds.push(category.id.toString());
    await categoryRepository.save(category);

    category.updateIcon(CategoryIcon.of("storefront"));
    await categoryRepository.save(category);

    const updated = await categoryRepository.findById(category.id);
    assert.equal(updated?.icon?.toString(), "storefront");
  });

  test("renombra y deprecia una categoría existente", { skip }, async () => {
    const familyId = FamilyId.generate();
    const category = Category.create(
      familyId,
      FinancialItemType.Income,
      CategoryName.of("Sueldo integración"),
    );
    createdCategoryIds.push(category.id.toString());
    await categoryRepository.save(category);

    category.rename(CategoryName.of("Sueldo neto"));
    category.deprecate();
    await categoryRepository.save(category);

    const updated = await categoryRepository.findById(category.id);
    assert.equal(updated?.name.toString(), "Sueldo neto");
    assert.equal(updated?.status, "DEPRECATED");
  });

  test("elimina una categoría", { skip }, async () => {
    const familyId = FamilyId.generate();
    const category = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Transporte integración"),
    );
    await categoryRepository.save(category);

    await categoryRepository.delete(category.id);

    assert.equal(await categoryRepository.findById(category.id), null);
  });
});
