import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FinancialItem } from "../../../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { CategoryAssignment } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { Money } from "../../../../../src/contexts/financial-tracking/domain/value-objects/money.js";
import { Note } from "../../../../../src/contexts/financial-tracking/domain/value-objects/note.js";
import { Title } from "../../../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";

describe("FinancialItem", () => {
  const clp = Currency.of("CLP");
  const yesterday = new Date(Date.now() - 86_400_000);

  function makeProps() {
    return {
      familyId: FamilyId.generate(),
      recordedBy: UserId.generate(),
      amount: Money.of(10_000, clp),
      category: CategoryAssignment.of(CategoryId.generate()),
      title: Title.of("Almuerzo"),
      occurredOn: TransactionDate.of(yesterday),
    };
  }

  describe("create()", () => {
    it("crea un FinancialItem con id generado", () => {
      const item = FinancialItem.create(makeProps());
      assert.ok(item.id);
    });

    it("el tipo por defecto es Expense", () => {
      assert.equal(FinancialItem.create(makeProps()).type, FinancialItemType.Expense);
    });

    it("acepta tipo explícito Income", () => {
      const item = FinancialItem.create({ ...makeProps(), type: FinancialItemType.Income });
      assert.equal(item.type, FinancialItemType.Income);
    });

    it("la nota es null por defecto", () => {
      assert.equal(FinancialItem.create(makeProps()).note, null);
    });

    it("acepta nota opcional", () => {
      const item = FinancialItem.create({ ...makeProps(), note: Note.of("Con tarjeta") });
      assert.ok(item.note !== null);
    });

    it("registra la fecha de creación", () => {
      const before = new Date();
      const item = FinancialItem.create(makeProps());
      assert.ok(item.createdAt >= before);
    });
  });

  describe("reclassify()", () => {
    it("actualiza la asignación de categoría", () => {
      const item = FinancialItem.create(makeProps());
      const newCategory = CategoryAssignment.of(CategoryId.generate());
      item.reclassify(newCategory);
      assert.ok(item.categoryAssignment.equals(newCategory));
    });

    it("dispara ItemReclassified", () => {
      const item = FinancialItem.create(makeProps());
      item.pullDomainEvents();
      const newCategory = CategoryAssignment.of(CategoryId.generate());
      item.reclassify(newCategory);
      const events = item.pullDomainEvents();
      assert.equal(events.length, 1);
      assert.equal(events[0]?.eventName, "financial-tracking.item-reclassified");
    });
  });

  describe("updateAmount()", () => {
    it("actualiza el monto", () => {
      const item = FinancialItem.create(makeProps());
      const newAmount = Money.of(20_000, clp);
      item.updateAmount(newAmount);
      assert.ok(item.amount.isGreaterThan(Money.of(15_000, clp)));
    });
  });
});
