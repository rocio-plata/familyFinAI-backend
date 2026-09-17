// tests/unit/contexts/financial-tracking/http/set-default-payment-method.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
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
import { InMemoryUserPaymentMethodPreferenceRepository } from "../doubles/in-memory-user-payment-method-preference.repository.js";

describe("PUT /families/:familyId/me/default-payment-method", () => {
  let app: FastifyInstance;
  let familyId: FamilyId;
  let ownerId: UserId;
  let ownerAuthorization: string;
  let activePaymentMethodId: string;
  let deprecatedPaymentMethodId: string;
  let preferenceRepository: InMemoryUserPaymentMethodPreferenceRepository;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    ownerId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.pullDomainEvents();
    await familyRepository.save(family);
    familyId = family.id;
    ownerAuthorization = `Bearer ${await jwtService.sign(ownerId)}`;

    const activePaymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(activePaymentMethod);
    activePaymentMethodId = activePaymentMethod.id.toString();

    const deprecatedPaymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Cheque"));
    deprecatedPaymentMethod.deprecate();
    await paymentMethodRepository.save(deprecatedPaymentMethod);
    deprecatedPaymentMethodId = deprecatedPaymentMethod.id.toString();

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({
        paymentMethodRepository,
        preferenceRepository,
      }),
    });
  });

  test("fija un medio de pago activo como default del usuario", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/families/${familyId.toString()}/me/default-payment-method`,
      headers: { authorization: ownerAuthorization },
      payload: { paymentMethodId: activePaymentMethodId },
    });

    assert.equal(response.statusCode, 204);
    const preference = await preferenceRepository.findByUserAndFamily(ownerId, familyId);
    assert.ok(preference);
    assert.ok(preference.defaultPaymentMethodId.equals(PaymentMethodId.of(activePaymentMethodId)));
  });

  test("responde 400 al intentar fijar un medio de pago deprecado", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/families/${familyId.toString()}/me/default-payment-method`,
      headers: { authorization: ownerAuthorization },
      payload: { paymentMethodId: deprecatedPaymentMethodId },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_ACTIVE");
  });

  test("responde 404 cuando el medio de pago no existe", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/families/${familyId.toString()}/me/default-payment-method`,
      headers: { authorization: ownerAuthorization },
      payload: { paymentMethodId: PaymentMethodId.generate().toString() },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_FOUND");
  });

  test("rechaza un body sin paymentMethodId", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/families/${familyId.toString()}/me/default-payment-method`,
      headers: { authorization: ownerAuthorization },
      payload: {},
    });

    assert.equal(response.statusCode, 400);
    assert.equal(JSON.parse(response.body).error, "HTTP.INVALID_REQUEST_BODY");
  });

  test("rechaza la solicitud sin token", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/families/${familyId.toString()}/me/default-payment-method`,
      payload: { paymentMethodId: activePaymentMethodId },
    });

    assert.equal(response.statusCode, 401);
  });
});
