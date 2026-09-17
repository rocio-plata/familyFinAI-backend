// tests/unit/contexts/financial-tracking/http/deprecate-payment-method.route.test.ts
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

describe("POST /families/:familyId/payment-methods/:paymentMethodId/deprecate", () => {
  let app: FastifyInstance;
  let familyId: string;
  let paymentMethodId: string;
  let ownerAuthorization: string;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const ownerId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.pullDomainEvents();
    await familyRepository.save(family);

    const paymentMethod = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(paymentMethod);

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

  test("deprecia un medio de pago existente", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/payment-methods/${paymentMethodId}/deprecate`,
      headers: { authorization: ownerAuthorization },
    });
    assert.equal(response.statusCode, 204);

    const listResponse = await app.inject({
      method: "GET",
      url: `/families/${familyId}/payment-methods?includeDeprecated=true`,
      headers: { authorization: ownerAuthorization },
    });
    const [paymentMethod] = JSON.parse(listResponse.body);
    assert.equal(paymentMethod.status, "DEPRECATED");
  });

  test("oculta el medio de pago deprecado del listado predeterminado", async () => {
    await app.inject({
      method: "POST",
      url: `/families/${familyId}/payment-methods/${paymentMethodId}/deprecate`,
      headers: { authorization: ownerAuthorization },
    });

    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/payment-methods`,
      headers: { authorization: ownerAuthorization },
    });
    assert.deepEqual(JSON.parse(response.body), []);
  });

  test("responde 404 cuando el medio de pago no existe", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/payment-methods/${PaymentMethodId.generate().toString()}/deprecate`,
      headers: { authorization: ownerAuthorization },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_FOUND");
  });

  test("rechaza la solicitud sin token", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/families/${familyId}/payment-methods/${paymentMethodId}/deprecate`,
    });

    assert.equal(response.statusCode, 401);
  });
});
