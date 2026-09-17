// tests/contexts/financial-tracking/delete-payment-method.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { DeletePaymentMethodUseCase } from "../../../src/contexts/financial-tracking/application/commands/delete-payment-method.usecase.js";
import { PaymentMethod } from "../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { UserPaymentMethodPreference } from "../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import { PaymentMethodHasAssociatedItemsError } from "../../../src/contexts/financial-tracking/domain/errors/payment-method-has-associated-items.error.js";
import { PaymentMethodIsSomeonesDefaultError } from "../../../src/contexts/financial-tracking/domain/errors/payment-method-is-someones-default.error.js";
import { PaymentMethodNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/payment-method-not-found.error.js";
import { PaymentMethodDeletionService } from "../../../src/contexts/financial-tracking/domain/services/payment-method-deletion.service.js";
import { PaymentMethodName } from "../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { FakePaymentMethodItemAssociationReader } from "./doubles/fake-payment-method-item-association-reader.js";
import { InMemoryPaymentMethodRepository } from "./doubles/in-memory-payment-method.repository.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "./doubles/in-memory-user-payment-method-preference.repository.js";

async function createContext() {
  const ownerId = UserId.generate();
  const memberId = UserId.generate();
  const family = Family.create(FamilyName.of("Familia"), ownerId);
  family.addMemberFromInvitationData(memberId, Role.member());
  const familyRepository = new InMemoryFamilyRepository();
  await familyRepository.save(family);
  const paymentMethodRepository = new InMemoryPaymentMethodRepository();
  const preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
  const associationReader = new FakePaymentMethodItemAssociationReader();
  const useCase = new DeletePaymentMethodUseCase(
    paymentMethodRepository,
    preferenceRepository,
    new PaymentMethodDeletionService(associationReader),
    new GetFamilyMembershipQuery(familyRepository),
  );

  return {
    family,
    ownerId,
    memberId,
    paymentMethodRepository,
    preferenceRepository,
    associationReader,
    useCase,
  };
}

describe("DeletePaymentMethodUseCase", () => {
  test("elimina físicamente un medio sin defaults ni items asociados", async () => {
    const { family, ownerId, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);

    await useCase.execute({
      familyId: family.id,
      requestedBy: ownerId,
      paymentMethodId: paymentMethod.id,
    });

    assert.equal(await paymentMethodRepository.findById(paymentMethod.id), null);
  });

  test("permite a un Member eliminar un medio", async () => {
    const { family, memberId, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Tarjeta"));
    await paymentMethodRepository.save(paymentMethod);

    await assert.doesNotReject(() =>
      useCase.execute({
        familyId: family.id,
        requestedBy: memberId,
        paymentMethodId: paymentMethod.id,
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
        }),
      { name: "InsufficientRoleError" },
    );
  });

  test("rechaza un medio perteneciente a otra familia", async () => {
    const { family, ownerId, paymentMethodRepository, useCase } = await createContext();
    const foreignPaymentMethod = PaymentMethod.create(
      FamilyId.generate(),
      PaymentMethodName.of("Efectivo"),
    );
    await paymentMethodRepository.save(foreignPaymentMethod);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          requestedBy: ownerId,
          paymentMethodId: foreignPaymentMethod.id,
        }),
      PaymentMethodNotFoundError,
    );
  });

  test("rechaza un medio usado como default", async () => {
    const { family, ownerId, paymentMethodRepository, preferenceRepository, useCase } =
      await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);
    await preferenceRepository.save(
      UserPaymentMethodPreference.create(UserId.generate(), family.id, paymentMethod.id),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          requestedBy: ownerId,
          paymentMethodId: paymentMethod.id,
        }),
      PaymentMethodIsSomeonesDefaultError,
    );
  });

  test("rechaza un medio con items asociados", async () => {
    const { family, ownerId, paymentMethodRepository, associationReader, useCase } =
      await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);
    associationReader.setItemCount(paymentMethod.id, 1);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          requestedBy: ownerId,
          paymentMethodId: paymentMethod.id,
        }),
      PaymentMethodHasAssociatedItemsError,
    );
  });

  test("permite eliminar un medio deprecado sin referencias", async () => {
    const { family, ownerId, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    paymentMethod.deprecate();
    await paymentMethodRepository.save(paymentMethod);

    await useCase.execute({
      familyId: family.id,
      requestedBy: ownerId,
      paymentMethodId: paymentMethod.id,
    });

    assert.equal(await paymentMethodRepository.findById(paymentMethod.id), null);
  });
});
