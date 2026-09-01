// tests/contexts/family-access/change-default-currency.usecase.test.ts

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { ChangeDefaultCurrencyUseCase } from "../../../src/contexts/family-access/application/commands/change-default-currency.usecase.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyNotFoundError } from "../../../src/contexts/family-access/domain/errors/family-not-found.error.js";
import { InsufficientRoleError } from "../../../src/contexts/family-access/domain/errors/insufficient-role.error.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { UnsupportedCurrencyError } from "../../../src/shared-kernel/errors/unsupported-currency.error.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";

describe("ChangeDefaultCurrencyUseCase", () => {
  let familyRepository: InMemoryFamilyRepository;
  let useCase: ChangeDefaultCurrencyUseCase;
  let ownerId: UserId;
  let family: Family;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    useCase = new ChangeDefaultCurrencyUseCase(familyRepository);

    ownerId = UserId.generate();
    family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    await familyRepository.save(family);
  });

  test("cambia la moneda por defecto cuando quien ejecuta es Owner", async () => {
    await useCase.execute({ familyId: family.id, newCurrency: "USD", changedBy: ownerId });

    const updated = await familyRepository.findById(family.id);
    assert.equal(updated?.defaultCurrency.toString(), "USD");
  });

  test("rechaza si la familia no existe", async () => {
    await assert.rejects(
      () =>
        useCase.execute({ familyId: FamilyId.generate(), newCurrency: "USD", changedBy: ownerId }),
      FamilyNotFoundError,
    );
  });

  test("rechaza si quien ejecuta no es Owner", async () => {
    const nonOwnerId = UserId.generate();
    family.addMemberFromInvitationData(nonOwnerId, Role.member());
    await familyRepository.save(family);

    await assert.rejects(
      () => useCase.execute({ familyId: family.id, newCurrency: "USD", changedBy: nonOwnerId }),
      InsufficientRoleError,
    );
  });

  test("rechaza una moneda no soportada", async () => {
    await assert.rejects(
      () => useCase.execute({ familyId: family.id, newCurrency: "XYZ", changedBy: ownerId }),
      UnsupportedCurrencyError,
    );
  });
});
