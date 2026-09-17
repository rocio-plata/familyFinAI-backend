// tests/unit/contexts/financial-tracking/infrastructure/persistence/in-memory-financial-item.repository.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FinancialItem } from "../../../../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryAssignment } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { PaymentMethodId } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";
import { Title } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { InMemoryFinancialItemRepository } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/in-memory-financial-item.repository.js";
import { Currency } from "../../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../../src/shared-kernel/domain/money.js";

function makeItem(paymentMethodId: PaymentMethodId): FinancialItem {
  return FinancialItem.create(
    {
      familyId: FamilyId.generate(),
      recordedBy: UserId.generate(),
      paymentMethodId,
      amount: Money.of(1000, Currency.default()),
      category: CategoryAssignment.of(CategoryId.generate()),
      title: Title.of("Compra"),
      occurredOn: TransactionDate.of(new Date("2026-08-01")),
    },
    FinancialItemType.Expense,
  );
}

describe("InMemoryFinancialItemRepository.countByPaymentMethod", () => {
  test("cuenta solo los items asociados al medio solicitado", async () => {
    const repository = new InMemoryFinancialItemRepository();
    const paymentMethodId = PaymentMethodId.generate();
    const otherPaymentMethodId = PaymentMethodId.generate();

    await repository.save(makeItem(paymentMethodId));
    await repository.save(makeItem(paymentMethodId));
    await repository.save(makeItem(otherPaymentMethodId));

    assert.equal(await repository.countByPaymentMethod(paymentMethodId), 2);
    assert.equal(await repository.countByPaymentMethod(otherPaymentMethodId), 1);
  });

  test("el conteo disminuye al eliminar un item", async () => {
    const repository = new InMemoryFinancialItemRepository();
    const paymentMethodId = PaymentMethodId.generate();
    const item = makeItem(paymentMethodId);

    await repository.save(item);
    await repository.delete(item.id);

    assert.equal(await repository.countByPaymentMethod(paymentMethodId), 0);
  });
});
