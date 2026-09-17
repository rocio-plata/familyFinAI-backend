// tests/unit/contexts/financial-tracking/http/rename-payment-method.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { PaymentMethod } from "../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { PaymentMethodId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";
import { PaymentMethodName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { buildApp } from "../../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";
import { InMemoryPaymentMethodRepository } from "../doubles/in-memory-payment-method.repository.js";

describe("PATCH /families/:familyId/payment-methods/:paymentMethodId", () => {
  let app: FastifyInstance;
  let familyId: string;
  let paymentMethodId: string;
  let ownerAuthorization: string;
  let paymentMethodRepository: InMemoryPaymentMethodRepository;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const ownerId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.pullDomainEvents();
    await familyRepository.save(family);

    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);
    const otherPaymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Tarjeta"));
    await paymentMethodRepository.save(otherPaymentMethod);

    familyId = family.id.toString();
    paymentMethodId = paymentMethod.id.toString();
    ownerAuthorization = `Bearer ${await jwtService.sign(ownerId)}`;

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({ paymentMethodRepository }),
    });
  });

  test("renombra un medio de pago existente", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/payment-methods/${paymentMethodId}`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "Caja Chica" },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.id, paymentMethodId);
    assert.equal(body.name, "Caja Chica");
  });

  test("rechaza un nombre duplicado con otro medio de pago de la misma familia", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/payment-methods/${paymentMethodId}`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "tarjeta" },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(
      JSON.parse(response.body).error,
      "FINANCIAL_TRACKING.DUPLICATE_PAYMENT_METHOD_NAME",
    );
  });

  test("responde 404 cuando el medio de pago no existe", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/payment-methods/${PaymentMethodId.generate().toString()}`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "Caja Chica" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_FOUND");
  });

  test("responde 404 cuando el medio de pago pertenece a otra familia", async () => {
    const otherFamily = Family.create(FamilyName.of("Otra familia"), UserId.generate());
    const foreignPaymentMethod = PaymentMethod.create(
      otherFamily.id,
      PaymentMethodName.of("Ajena"),
    );
    await paymentMethodRepository.save(foreignPaymentMethod);

    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/payment-methods/${foreignPaymentMethod.id.toString()}`,
      headers: { authorization: ownerAuthorization },
      payload: { name: "Caja Chica" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_FOUND");
  });

  test("rechaza un body sin name", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/payment-methods/${paymentMethodId}`,
      headers: { authorization: ownerAuthorization },
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });

  test("rechaza la solicitud sin token", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/families/${familyId}/payment-methods/${paymentMethodId}`,
      payload: { name: "Caja Chica" },
    });

    assert.equal(response.statusCode, 401);
  });
});
