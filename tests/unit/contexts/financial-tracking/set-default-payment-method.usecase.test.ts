// tests/unit/contexts/financial-tracking/set-default-payment-method.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { SetDefaultPaymentMethodUseCase } from "../../../../src/contexts/financial-tracking/application/commands/set-default-payment-method.usecase.js";
import { PaymentMethod } from "../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { UserPaymentMethodPreference } from "../../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import { PaymentMethodNotActiveError } from "../../../../src/contexts/financial-tracking/domain/errors/payment-method-not-active.error.js";
import { PaymentMethodNotFoundError } from "../../../../src/contexts/financial-tracking/domain/errors/payment-method-not-found.error.js";
import { PaymentMethodName } from "../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
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
  const useCase = new SetDefaultPaymentMethodUseCase(
    paymentMethodRepository,
    preferenceRepository,
    new GetFamilyMembershipQuery(familyRepository),
  );

  return { family, ownerId, memberId, paymentMethodRepository, preferenceRepository, useCase };
}

describe("SetDefaultPaymentMethodUseCase", () => {
  test("crea la preferencia del usuario con el medio activo indicado", async () => {
    const { family, memberId, paymentMethodRepository, preferenceRepository, useCase } =
      await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Tarjeta"));
    await paymentMethodRepository.save(paymentMethod);

    await useCase.execute({
      familyId: family.id,
      userId: memberId,
      paymentMethodId: paymentMethod.id,
    });

    const preference = await preferenceRepository.findByUserAndFamily(memberId, family.id);
    assert.ok(preference);
    assert.ok(preference.defaultPaymentMethodId.equals(paymentMethod.id));
  });

  test("actualiza la preferencia existente sin duplicarla", async () => {
    const { family, memberId, paymentMethodRepository, preferenceRepository, useCase } =
      await createContext();
    const first = PaymentMethod.create(family.id, PaymentMethodName.of("Tarjeta"));
    const second = PaymentMethod.create(family.id, PaymentMethodName.of("Transferencia"));
    await paymentMethodRepository.save(first);
    await paymentMethodRepository.save(second);
    await preferenceRepository.save(
      UserPaymentMethodPreference.create(memberId, family.id, first.id),
    );

    await useCase.execute({
      familyId: family.id,
      userId: memberId,
      paymentMethodId: second.id,
    });

    const preference = await preferenceRepository.findByUserAndFamily(memberId, family.id);
    assert.ok(preference);
    assert.ok(preference.defaultPaymentMethodId.equals(second.id));
    assert.equal(preferenceRepository.preferences.length, 1);
  });

  test("rechaza a un usuario que no pertenece a la familia", async () => {
    const { family, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Tarjeta"));
    await paymentMethodRepository.save(paymentMethod);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          userId: UserId.generate(),
          paymentMethodId: paymentMethod.id,
        }),
      { name: "InsufficientRoleError" },
    );
  });

  test("rechaza un medio perteneciente a otra familia", async () => {
    const { family, ownerId, paymentMethodRepository, useCase } = await createContext();
    const foreignPaymentMethod = PaymentMethod.create(
      FamilyId.generate(),
      PaymentMethodName.of("Tarjeta"),
    );
    await paymentMethodRepository.save(foreignPaymentMethod);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          userId: ownerId,
          paymentMethodId: foreignPaymentMethod.id,
        }),
      PaymentMethodNotFoundError,
    );
  });

  test("rechaza un medio deprecado", async () => {
    const { family, memberId, paymentMethodRepository, useCase } = await createContext();
    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Tarjeta"));
    paymentMethod.deprecate();
    await paymentMethodRepository.save(paymentMethod);

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          userId: memberId,
          paymentMethodId: paymentMethod.id,
        }),
      PaymentMethodNotActiveError,
    );
  });
});
