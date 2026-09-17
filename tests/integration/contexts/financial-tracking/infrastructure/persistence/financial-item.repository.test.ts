// tests/integration/contexts/financial-tracking/infrastructure/persistence/financial-item.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { Category } from "../../../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { FinancialItem } from "../../../../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { PaymentMethod } from "../../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { CategoryAssignment } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { PaymentMethodName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { Title } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { DrizzleCategoryRepository } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-category.repository.js";
import { DrizzleFinancialItemRepository } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-financial-item.repository.js";
import { DrizzlePaymentMethodRepository } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-payment-method.repository.js";
import {
  categories,
  paymentMethods,
} from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/schema.js";
import { db } from "../../../../../../src/platform/db/connection.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../../src/shared-kernel/domain/money.js";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const categoryRepository = new DrizzleCategoryRepository();
const paymentMethodRepository = new DrizzlePaymentMethodRepository();
const financialItemRepository = new DrizzleFinancialItemRepository();
const createdCategoryIds: string[] = [];
const createdPaymentMethodIds: string[] = [];

after(async () => {
  if (!hasDatabase) return;
  // los financial_items se borran en cascada al eliminar su categoría/medio de pago referenciado no aplica
  // (no hay onDelete cascade), así que primero eliminamos los items dentro de cada test.
  for (const id of createdCategoryIds) {
    await db.delete(categories).where(eq(categories.id, id));
  }
  for (const id of createdPaymentMethodIds) {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }
});

describe("Persistencia Drizzle de movimientos financieros (integración)", () => {
  test("guarda, busca, actualiza y elimina un movimiento", { skip }, async () => {
    const familyId = FamilyId.generate();
    const recordedBy = UserId.generate();
    const category = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Comida integración"),
    );
    const paymentMethod = PaymentMethod.create(
      familyId,
      PaymentMethodName.of("Débito integración"),
    );
    createdCategoryIds.push(category.id.toString());
    createdPaymentMethodIds.push(paymentMethod.id.toString());
    await categoryRepository.save(category);
    await paymentMethodRepository.save(paymentMethod);

    const item = FinancialItem.create(
      {
        familyId,
        recordedBy,
        paymentMethodId: paymentMethod.id,
        amount: Money.of(1500, Currency.of("CLP")),
        category: CategoryAssignment.of(category.id),
        title: Title.of("Almuerzo"),
        occurredOn: TransactionDate.of(new Date("2026-01-15T12:00:00.000Z")),
      },
      FinancialItemType.Expense,
    );

    await financialItemRepository.save(item);
    const found = await financialItemRepository.findById(item.id);
    assert.ok(found);
    assert.equal(found.title.toString(), "Almuerzo");
    assert.equal(found.amount.amount, 1500);

    assert.equal(await financialItemRepository.countByCategory(category.id), 1);
    assert.equal(await financialItemRepository.countByPaymentMethod(paymentMethod.id), 1);

    const byFamily = await financialItemRepository.findByFamilyId(familyId);
    assert.equal(byFamily.length, 1);

    await financialItemRepository.delete(item.id);
    assert.equal(await financialItemRepository.findById(item.id), null);
  });
});
