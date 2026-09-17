// tests/unit/contexts/financial-tracking/http/get-payment-methods.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../../src/contexts/family-access/domain/entities/family.js";
import { FamilyName } from "../../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { Role } from "../../../../../src/contexts/family-access/domain/value-objects/role.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { PaymentMethod } from "../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { PaymentMethodName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { buildApp } from "../../../../../src/platform/app.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";
import { InMemoryPaymentMethodRepository } from "../doubles/in-memory-payment-method.repository.js";

describe("GET /families/:familyId/payment-methods", () => {
  let app: FastifyInstance;
  let familyId: string;
  let memberAuthorization: string;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    const ownerId = UserId.generate();
    const memberId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    const paymentMethodRepository = new InMemoryPaymentMethodRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.addMemberFromInvitationData(memberId, Role.member());
    family.pullDomainEvents();
    await familyRepository.save(family);
    familyId = family.id.toString();
    memberAuthorization = `Bearer ${await jwtService.sign(memberId)}`;

    const active = PaymentMethod.create(family.id, PaymentMethodName.of("Efectivo"));
    await paymentMethodRepository.save(active);

    const deprecated = PaymentMethod.create(family.id, PaymentMethodName.of("Cheque"));
    deprecated.deprecate();
    await paymentMethodRepository.save(deprecated);

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({ paymentMethodRepository }),
    });
  });

  test("devuelve los medios de pago activos por defecto", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/payment-methods`,
      headers: { authorization: memberAuthorization },
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.length, 1);
    assert.equal(body[0].name, "Efectivo");
    assert.equal(body[0].status, "ACTIVE");
  });

  test("incluye los deprecados cuando includeDeprecated es true", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/payment-methods?includeDeprecated=true`,
      headers: { authorization: memberAuthorization },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).length, 2);
  });

  test("rechaza a quien no pertenece a la familia", async () => {
    const outsiderAuthorization = `Bearer ${await new FakeJwtService().sign(UserId.generate())}`;
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/payment-methods`,
      headers: { authorization: outsiderAuthorization },
    });

    assert.equal(response.statusCode, 403);
  });

  test("rechaza la consulta sin token", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/families/${familyId}/payment-methods`,
    });

    assert.equal(response.statusCode, 401);
  });
});
