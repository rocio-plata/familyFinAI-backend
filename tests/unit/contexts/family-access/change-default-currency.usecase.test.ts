// tests/unit/contexts/family-access/change-default-currency.usecase.test.ts

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { ChangeDefaultCurrencyUseCase } from "../../../../src/contexts/family-access/application/commands/change-default-currency.usecase.js";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import type { CurrencyLockedError } from "../../../../src/contexts/family-access/domain/errors/currency-locked.error.js";
import { FamilyNotFoundError } from "../../../../src/contexts/family-access/domain/errors/family-not-found.error.js";
import { InsufficientRoleError } from "../../../../src/contexts/family-access/domain/errors/insufficient-role.error.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { UnsupportedCurrencyError } from "../../../../src/shared-kernel/errors/unsupported-currency.error.js";
import { FakeFamilyFinancialActivity } from "./doubles/fake-family-financial-activity.js";
import { InMemoryFamilyRepository } from "./doubles/in-memory-family.repository.js";

describe("ChangeDefaultCurrencyUseCase", () => {
  let familyRepository: InMemoryFamilyRepository;
  let useCase: ChangeDefaultCurrencyUseCase;
  let ownerId: UserId;
  let family: Family;
  let financialActivity: FakeFamilyFinancialActivity;

  beforeEach(async () => {
    familyRepository = new InMemoryFamilyRepository();
    financialActivity = new FakeFamilyFinancialActivity();
    useCase = new ChangeDefaultCurrencyUseCase(familyRepository, financialActivity);

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

  test("bloquea el cambio si existen items y presupuestos activos", async () => {
    financialActivity.setItemsExist(true);
    financialActivity.setActiveBudgetsExist(true);

    await assert.rejects(
      () => useCase.execute({ familyId: family.id, newCurrency: "USD", changedBy: ownerId }),
      (error: CurrencyLockedError) => {
        assert.deepEqual(error.details.reasons, ["ITEMS_EXIST", "ACTIVE_BUDGETS_EXIST"]);
        return true;
      },
    );
  });

  test("permite cambiar si no existen items ni presupuestos activos", async () => {
    await useCase.execute({ familyId: family.id, newCurrency: "USD", changedBy: ownerId });

    assert.equal((await familyRepository.findById(family.id))?.defaultCurrency.toString(), "USD");
  });

  test("no consulta actividad al cambiar a la misma moneda", async () => {
    financialActivity.setItemsExist(true);

    await useCase.execute({ familyId: family.id, newCurrency: "CLP", changedBy: ownerId });

    assert.equal(financialActivity.calls, 0);
  });
});
