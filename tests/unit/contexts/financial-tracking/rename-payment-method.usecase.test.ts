// tests/unit/contexts/financial-tracking/rename-payment-method.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { RenamePaymentMethodUseCase } from "../../../../src/contexts/financial-tracking/application/commands/rename-payment-method.usecase.js";
import { PaymentMethod } from "../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { DuplicatePaymentMethodNameError } from "../../../../src/contexts/financial-tracking/domain/errors/duplicate-payment-method-name.error.js";
import { PaymentMethodNotFoundError } from "../../../../src/contexts/financial-tracking/domain/errors/payment-method-not-found.error.js";
import { PaymentMethodName } from "../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryPaymentMethodRepository } from "./doubles/in-memory-payment-method.repository.js";

async function createContext() {
  const ownerId = UserId.generate();
  const memberId = UserId.generate();
  const family = Family.create(FamilyName.of("Familia"), ownerId);
  family.addMemberFromInvitationData(memberId, Role.member());
  const familyRepository = new InMemoryFamilyRepository();
  await familyRepository.save(family);
  const paymentMethodRepository = new InMemoryPaymentMethodRepository();
  const useCase = new RenamePaymentMethodUseCase(
    paymentMethodRepository,
    new GetFamilyMembershipQuery(familyRepository),
  );

  return { family, ownerId, memberId, paymentMethodRepository, useCase };
}

describe("RenamePaymentMethodUseCase", () => {
  test("permite a un Owner renombrar un medio de su familia", async () => {
    const { family, ownerId, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);

    const renamed = await useCase.execute({
      familyId: family.id,
      requestedBy: ownerId,
      paymentMethodId: paymentMethod.id,
      newName: PaymentMethodName.of("Caja chica"),
    });

    assert.equal(renamed.name.toString(), "Caja chica");
    assert.equal(
      (await paymentMethodRepository.findById(paymentMethod.id))?.name.toString(),
      "Caja chica",
    );
  });

  test("permite a un Member renombrar un medio de su familia", async () => {
    const { family, memberId, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);

    await assert.doesNotReject(() =>
      useCase.execute({
        familyId: family.id,
        requestedBy: memberId,
        paymentMethodId: paymentMethod.id,
        newName: PaymentMethodName.of("Caja chica"),
      }),
    );
  });

  test("rechaza a un usuario que no pertenece a la familia", async () => {
    const { family, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          requestedBy: UserId.generate(),
          paymentMethodId: paymentMethod.id,
          newName: PaymentMethodName.of("Caja chica"),
        }),
      { name: "InsufficientRoleError" },
    );
  });

  test("rechaza un medio perteneciente a otra familia", async () => {
    const { family, ownerId, paymentMethodRepository, useCase } = await createContext();
    const foreignFamilyId = FamilyId.generate();
    const foreignPaymentMethod = PaymentMethod.create(
      foreignFamilyId,
      PaymentMethodName.of("Efectivo"),
    );
    await paymentMethodRepository.save(foreignPaymentMethod);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          requestedBy: ownerId,
          paymentMethodId: foreignPaymentMethod.id,
          newName: PaymentMethodName.of("Caja chica"),
        }),
      PaymentMethodNotFoundError,
    );
  });

  test("rechaza un nombre ya usado por otro medio de la familia", async () => {
    const { family, ownerId, paymentMethodRepository, useCase } = await createContext();
    const current = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    const other = PaymentMethod.create(family.id, PaymentMethodName.of("Tarjeta"));
    await paymentMethodRepository.save(current);
    await paymentMethodRepository.save(other);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          requestedBy: ownerId,
          paymentMethodId: current.id,
          newName: PaymentMethodName.of("tarjeta"),
        }),
      DuplicatePaymentMethodNameError,
    );
  });

  test("permite conservar el mismo nombre cambiando solo las mayúsculas", async () => {
    const { family, ownerId, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);

    await assert.doesNotReject(() =>
      useCase.execute({
        familyId: family.id,
        requestedBy: ownerId,
        paymentMethodId: paymentMethod.id,
        newName: PaymentMethodName.of("efectivo"),
      }),
    );
  });
});
