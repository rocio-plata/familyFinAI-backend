// tests/contexts/family-access/reorder-my-families.usecase.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { ReorderMyFamiliesUseCase } from "../../../src/contexts/family-access/application/commands/reorder-my-families.usecase.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { InvalidFamilyOrderError } from "../../../src/contexts/family-access/domain/errors/invalid-family-order.error.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";

describe("ReorderMyFamiliesUseCase", () => {
  let familyRepository: InMemoryFamilyRepository;
  let useCase: ReorderMyFamiliesUseCase;
  let userId: UserId;
  let familyA: Family;
  let familyB: Family;
  let familyC: Family;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    useCase = new ReorderMyFamiliesUseCase(familyRepository);
    userId = UserId.generate();

    familyA = Family.create(FamilyName.of("Familia A"), userId);
    familyB = Family.create(FamilyName.of("Familia B"), userId);
    familyC = Family.create(FamilyName.of("Familia C"), userId);
    await familyRepository.save(familyA);
    await familyRepository.save(familyB);
    await familyRepository.save(familyC);
  });

  test("asigna displayOrder según la posición del array recibido", async () => {
    await useCase.execute({ userId, orderedFamilyIds: [familyC.id, familyA.id, familyB.id] });

    const persistedA = await familyRepository.findById(familyA.id);
    const persistedB = await familyRepository.findById(familyB.id);
    const persistedC = await familyRepository.findById(familyC.id);

    assert.equal(persistedC?.findMembership(userId)?.displayOrder, 0);
    assert.equal(persistedA?.findMembership(userId)?.displayOrder, 1);
    assert.equal(persistedB?.findMembership(userId)?.displayOrder, 2);
  });

  test("rechaza si falta una familia del usuario en el array", async () => {
    await assert.rejects(
      () => useCase.execute({ userId, orderedFamilyIds: [familyA.id, familyB.id] }),
      InvalidFamilyOrderError,
    );
  });

  test("rechaza si el array incluye una familia que no es del usuario", async () => {
    await assert.rejects(
      () =>
        useCase.execute({
          userId,
          orderedFamilyIds: [familyA.id, familyB.id, familyC.id, FamilyId.generate()],
        }),
      InvalidFamilyOrderError,
    );
  });

  test("rechaza si el array tiene duplicados", async () => {
    await assert.rejects(
      () => useCase.execute({ userId, orderedFamilyIds: [familyA.id, familyA.id, familyB.id] }),
      InvalidFamilyOrderError,
    );
  });

  test("no persiste cambios si el orden recibido es inválido", async () => {
    await assert.rejects(() =>
      useCase.execute({ userId, orderedFamilyIds: [familyA.id, familyB.id] }),
    );

    const persistedA = await familyRepository.findById(familyA.id);
    assert.equal(persistedA?.findMembership(userId)?.displayOrder, null);
  });
});
