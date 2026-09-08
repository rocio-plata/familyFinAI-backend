// tests/contexts/financial-tracking/event-handlers/create-default-categories-on-family-created.event-handler.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyCreated } from "../../../../src/contexts/family-access/domain/events/family-created.event.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { CreateDefaultCategoriesOnFamilyCreatedEventHandler } from "../../../../src/contexts/financial-tracking/application/event-handlers/create-default-categories-on-family-created.event-handler.js";
import { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import { CategoryName } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-name.js";
import { InMemoryCategoryRepository } from "../doubles/in-memory-category.repository.js";

describe("CreateDefaultCategoriesOnFamilyCreatedEventHandler", () => {
  let categoryRepository: InMemoryCategoryRepository;
  let handler: CreateDefaultCategoriesOnFamilyCreatedEventHandler;

  beforeEach(() => {
    categoryRepository = new InMemoryCategoryRepository();
    handler = new CreateDefaultCategoriesOnFamilyCreatedEventHandler(categoryRepository);
  });

  test("crea las 9 categorías por defecto al recibir el evento FamilyCreated", async () => {
    const familyId = FamilyId.generate();
    const event = new FamilyCreated(familyId);

    await handler.handle(event);

    const categories = await categoryRepository.findByFamilyId(familyId);
    assert.equal(categories.length, 9);

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
    ];

    for (const expected of expectedNames) {
      assert.ok(names.includes(expected), `Falta la categoría por defecto: ${expected}`);
    }
  });

  test("no duplica categorías si alguna ya existe para la familia", async () => {
    const familyId = FamilyId.generate();
    const existingCategory = Category.create(familyId, CategoryName.of("Comestibles"));
    await categoryRepository.save(existingCategory);

    const event = new FamilyCreated(familyId);
    await handler.handle(event);

    const categories = await categoryRepository.findByFamilyId(familyId);
    assert.equal(categories.length, 9);
  });
});
