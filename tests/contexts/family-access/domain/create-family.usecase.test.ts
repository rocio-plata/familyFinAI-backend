// tests/contexts/family-access/create-family.usecase.test.ts
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { CreateFamilyUseCase } from "../../../src/contexts/family-access/application/commands/create-family.usecase.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { InvalidFamilyNameError } from "../../../src/contexts/family-access/domain/errors/invalid-family-name.error.js";

describe("CreateFamilyUseCase", () => {
  let repository: InMemoryFamilyRepository;
  let useCase: CreateFamilyUseCase;

  beforeEach(() => {
    repository = new InMemoryFamilyRepository();
    useCase = new CreateFamilyUseCase(repository);
  });

  test("crea una familia con el usuario creador como Owner", async () => {
    const creatorId = UserId.generate();

    const family = await useCase.execute({ name: "Familia Pérez", createdBy: creatorId });

    assert.equal(family.name.toString(), "Familia Pérez");
    assert.equal(family.members.length, 1);
    assert.ok(family.members[0].role.isOwner());
    assert.ok(family.members[0].userId.equals(creatorId));
  });

  test("persiste la familia en el repositorio", async () => {
    const creatorId = UserId.generate();

    const family = await useCase.execute({ name: "Familia Pérez", createdBy: creatorId });
    const found = await repository.findById(family.id);

    assert.ok(found !== null);
    assert.ok(found.id.equals(family.id));
  });

  test("la moneda por defecto es CLP", async () => {
    const family = await useCase.execute({ name: "Familia Pérez", createdBy: UserId.generate() });

    assert.equal(family.defaultCurrency.toString(), "CLP");
  });

  test("rechaza un nombre de familia vacío", async () => {
    await assert.rejects(
      () => useCase.execute({ name: "", createdBy: UserId.generate() }),
      InvalidFamilyNameError,
    );
  });

  test("rechaza un nombre de familia que excede el largo máximo", async () => {
    const tooLong = "a".repeat(61);

    await assert.rejects(
      () => useCase.execute({ name: tooLong, createdBy: UserId.generate() }),
      InvalidFamilyNameError,
    );
  });
});