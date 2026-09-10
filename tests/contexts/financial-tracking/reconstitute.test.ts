// tests/contexts/financial-tracking/reconstitute.test.ts

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { Category } from "../../../src/contexts/financial-tracking/domain/entities/category.js";
import { FinancialItem } from "../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryAssignment } from "../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryStatus } from "../../../src/contexts/financial-tracking/domain/value-objects/category-status.js";
import { FinancialItemType } from "../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { TagStatus } from "../../../src/contexts/financial-tracking/domain/value-objects/tag-status.js";
import { Currency } from "../../../src/shared-kernel/domain/currency.js";

describe("reconstitución de financial-tracking", () => {
  test("reconstruye una categoría y sus tags sin eventos", () => {
    const category = Category.reconstitute({
      id: "11111111-1111-4111-8111-111111111111",
      familyId: "22222222-2222-4222-8222-222222222222",
      type: FinancialItemType.Expense,
      name: "Supermercado",
      status: CategoryStatus.Active,
      tags: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: "Mensual",
          displayOrder: 0,
          status: TagStatus.Deprecated,
        },
      ],
    });

    assert.equal(category.name.toString(), "Supermercado");
    assert.equal(category.tags.length, 1);
    assert.equal(category.tags[0]?.status, TagStatus.Deprecated);
    assert.equal(category.pullDomainEvents().length, 0);
  });

  test("reconstruye un financial item sin eventos", () => {
    const item = FinancialItem.reconstitute({
      id: "44444444-4444-4444-8444-444444444444",
      familyId: FamilyId.generate().toString(),
      recordedBy: UserId.generate().toString(),
      type: FinancialItemType.Income,
      amount: 1250.5,
      currency: Currency.default().toString(),
      categoryId: "11111111-1111-4111-8111-111111111111",
      tagId: null,
      title: "Sueldo",
      note: null,
      occurredOn: new Date("2026-08-01T10:00:00Z"),
      createdAt: new Date("2026-08-01T10:01:00Z"),
    });

    assert.equal(item.type, FinancialItemType.Income);
    assert.equal(item.amount.amount, 1250.5);
    assert.ok(
      item.categoryAssignment.equals(CategoryAssignment.of(item.categoryAssignment.categoryId)),
    );
    assert.equal(item.pullDomainEvents().length, 0);
  });
});
