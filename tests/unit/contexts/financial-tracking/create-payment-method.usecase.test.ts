// tests/unit/contexts/financial-tracking/create-payment-method.usecase.test.ts
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GetFamilyMembershipQuery } from "../../../../src/contexts/family-access/application/queries/get-family-membership.query.js";
import { Family } from "../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { CreatePaymentMethodUseCase } from "../../../../src/contexts/financial-tracking/application/commands/create-payment-method.usecase.js";
import { DuplicatePaymentMethodNameError } from "../../../../src/contexts/financial-tracking/domain/errors/duplicate-payment-method-name.error.js";
import { PaymentMethodName } from "../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryFamilyRepository } from "../family-access/doubles/in-memory-family.repository.js";
import { InMemoryPaymentMethodRepository } from "./doubles/in-memory-payment-method.repository.js";

describe("CreatePaymentMethodUseCase", () => {
  test("permite a un Owner crear un medio para su familia", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia"), ownerId);
    const familyRepository = new InMemoryFamilyRepository();
    await familyRepository.save(family);
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const useCase = new CreatePaymentMethodUseCase(
      paymentMethodRepository,
      new GetFamilyMembershipQuery(familyRepository),
    );

    const paymentMethod = await useCase.execute({
      familyId: family.id,
      requestedBy: ownerId,
      name: PaymentMethodName.of("Efectivo"),
    });

    assert.ok(paymentMethod.id);
    assert.ok(paymentMethod.familyId.equals(family.id));
    assert.equal((await paymentMethodRepository.findByFamilyId(family.id)).length, 1);
  });

  test("permite a un Member crear un medio para su familia", async () => {
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    const familyRepository = new InMemoryFamilyRepository();
    await familyRepository.save(family);
    const useCase = new CreatePaymentMethodUseCase(
      new InMemoryPaymentMethodRepository(),
      new GetFamilyMembershipQuery(familyRepository),
    );

    await assert.doesNotReject(() =>
      useCase.execute({
        familyId: family.id,
        requestedBy: memberId,
        name: PaymentMethodName.of("Tarjeta"),
      }),
    );
  });

  test("rechaza a quien no pertenece a la familia", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia"), ownerId);
    const familyRepository = new InMemoryFamilyRepository();
    await familyRepository.save(family);
    const useCase = new CreatePaymentMethodUseCase(
      new InMemoryPaymentMethodRepository(),
      new GetFamilyMembershipQuery(familyRepository),
    );

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          requestedBy: UserId.generate(),
          name: PaymentMethodName.of("Tarjeta"),
        }),
      { name: "InsufficientRoleError" },
    );
  });

  test("rechaza nombres duplicados sin distinguir mayúsculas dentro de la familia", async () => {
    const ownerId = UserId.generate();
    const family = Family.create(FamilyName.of("Familia"), ownerId);
    const familyRepository = new InMemoryFamilyRepository();
    await familyRepository.save(family);
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const useCase = new CreatePaymentMethodUseCase(
      paymentMethodRepository,
      new GetFamilyMembershipQuery(familyRepository),
    );
    await useCase.execute({
      familyId: family.id,
      requestedBy: ownerId,
      name: PaymentMethodName.of("Efectivo"),
    });

    await assert.rejects(
      () =>
        useCase.execute({
          familyId: family.id,
          requestedBy: ownerId,
          name: PaymentMethodName.of("efectivo"),
        }),
      DuplicatePaymentMethodNameError,
    );
  });
});
