// tests/unit/contexts/financial-tracking/event-handlers/create-default-categories-on-family-created.event-handler.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyCreated } from "../../../../../src/contexts/family-access/domain/events/family-created.event.js";
import { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CreateDefaultCategoriesOnFamilyCreatedEventHandler } from "../../../../../src/contexts/financial-tracking/application/event-handlers/create-default-categories-on-family-created.event-handler.js";
import { Category } from "../../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { FinancialItemType } from "../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { InMemoryCategoryRepository } from "../doubles/in-memory-category.repository.js";

describe("CreateDefaultCategoriesOnFamilyCreatedEventHandler", () => {
  let categoryRepository: InMemoryCategoryRepository;
  let handler: CreateDefaultCategoriesOnFamilyCreatedEventHandler;

  beforeEach(() => {
    categoryRepository = new InMemoryCategoryRepository();
    handler = new CreateDefaultCategoriesOnFamilyCreatedEventHandler(categoryRepository);
  });

  test("crea las 12 categorías por defecto (9 de gasto y 3 de ingreso) al recibir el evento FamilyCreated", async () => {
    const familyId = FamilyId.generate();
    const event = new FamilyCreated(familyId, UserId.generate());

    await handler.handle(event);

    const categories = await categoryRepository.findByFamilyId(familyId);
    assert.equal(categories.length, 12);

    const names = categories.map((c) => c.name.toString());
    const expectedNames = [
      "Comestibles",
      "Salud",
      "Restaurantes",
      "Servicios",
      "Compras",
      "Regalos",
      "Familia",
      "Tiempo Libre",
      "Transporte",
      "Salario",
      "Ventas",
      "Otros",
    ];

    for (const expected of expectedNames) {
      assert.ok(names.includes(expected), `Falta la categoría por defecto: ${expected}`);
    }
  });

  test("crea Salario, Ventas y Otros como categorías de ingreso y el resto como gasto", async () => {
    const familyId = FamilyId.generate();

    await handler.handle(new FamilyCreated(familyId, UserId.generate()));

    const categories = await categoryRepository.findByFamilyId(familyId);
    const incomeNames = categories
      .filter((c) => c.type === FinancialItemType.Income)
      .map((c) => c.name.toString())
      .sort();
    assert.deepEqual(incomeNames, ["Otros", "Salario", "Ventas"]);
    assert.equal(categories.filter((c) => c.type === FinancialItemType.Expense).length, 9);
  });

  test("no duplica categorías si alguna ya existe para la familia", async () => {
    const familyId = FamilyId.generate();
    const existingCategory = Category.create(
      familyId,
      FinancialItemType.Expense,
      CategoryName.of("Comestibles"),
    );
    await categoryRepository.save(existingCategory);

    const event = new FamilyCreated(familyId, UserId.generate());
    await handler.handle(event);

    const categories = await categoryRepository.findByFamilyId(familyId);
    assert.equal(categories.length, 12);
  });
});
