// tests/contexts/financial-tracking/deprecate-payment-method.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { DeprecatePaymentMethodUseCase } from "../../../src/contexts/financial-tracking/application/commands/deprecate-payment-method.usecase.js";
import { PaymentMethod } from "../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { UserPaymentMethodPreference } from "../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import { PaymentMethodIsSomeonesDefaultError } from "../../../src/contexts/financial-tracking/domain/errors/payment-method-is-someones-default.error.js";
import { PaymentMethodNotFoundError } from "../../../src/contexts/financial-tracking/domain/errors/payment-method-not-found.error.js";
import { CategoryStatus } from "../../../src/contexts/financial-tracking/domain/value-objects/category-status.js";
import { PaymentMethodName } from "../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
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
  const useCase = new DeprecatePaymentMethodUseCase(
    paymentMethodRepository,
    preferenceRepository,
    new GetFamilyMembershipQuery(familyRepository),
  );

  return { family, ownerId, memberId, paymentMethodRepository, preferenceRepository, useCase };
}

describe("DeprecatePaymentMethodUseCase", () => {
  test("permite a un Owner deprecar un medio sin preferencias que lo usen", async () => {
    const { family, ownerId, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);

    const deprecated = await useCase.execute({
      familyId: family.id,
      requestedBy: ownerId,
      paymentMethodId: paymentMethod.id,
    });

    assert.equal(deprecated.status, CategoryStatus.Deprecated);
    assert.equal(
      (await paymentMethodRepository.findById(paymentMethod.id))?.status,
      CategoryStatus.Deprecated,
    );
  });

  test("permite a un Member deprecar un medio", async () => {
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

  test("rechaza deprecar un medio usado como default", async () => {
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
});
