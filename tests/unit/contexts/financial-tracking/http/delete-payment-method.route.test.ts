// tests/unit/contexts/financial-tracking/http/delete-payment-method.route.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { Family } from "../../../../../src/contexts/family-access/domain/entities/family.js";
import type { FamilyId } from "../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { FamilyName } from "../../../../../src/contexts/family-access/domain/value-objects/family-name.js";
import { UserId } from "../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { FinancialItem } from "../../../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import { PaymentMethod } from "../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { UserPaymentMethodPreference } from "../../../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import { CategoryAssignment } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-assignment.js";
import { CategoryId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import { FinancialItemType } from "../../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-type.js";
import { PaymentMethodId } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-id.js";
import { PaymentMethodName } from "../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { Title } from "../../../../../src/contexts/financial-tracking/domain/value-objects/title.js";
import { TransactionDate } from "../../../../../src/contexts/financial-tracking/domain/value-objects/transaction-date.js";
import { buildApp } from "../../../../../src/platform/app.js";
import { Currency } from "../../../../../src/shared-kernel/domain/currency.js";
import { Money } from "../../../../../src/shared-kernel/domain/money.js";
import { FakeJwtService } from "../../../platform/auth/doubles/fake-jwt-service.js";
import { buildTestFamilyAccessDependencies } from "../../family-access/build-test-family-access-dependencies.js";
import { InMemoryFamilyRepository } from "../../family-access/doubles/in-memory-family.repository.js";
import { buildTestIdentityDependencies } from "../../identity/build-test-identity-dependencies.js";
import { buildTestFinancialTrackingDependencies } from "../build-test-financial-tracking-dependencies.js";
import { InMemoryFinancialItemRepository } from "../doubles/in-memory-financial-item.repository.js";
import { InMemoryPaymentMethodRepository } from "../doubles/in-memory-payment-method.repository.js";
import { InMemoryUserPaymentMethodPreferenceRepository } from "../doubles/in-memory-user-payment-method-preference.repository.js";

describe("DELETE /families/:familyId/payment-methods/:paymentMethodId", () => {
  let app: FastifyInstance;
  let familyId: FamilyId;
  let ownerId: UserId;
  let ownerAuthorization: string;
  let paymentMethodRepository: InMemoryPaymentMethodRepository;
  let financialItemRepository: InMemoryFinancialItemRepository;
  let preferenceRepository: InMemoryUserPaymentMethodPreferenceRepository;
  let freePaymentMethodId: string;

  beforeEach(async () => {
    const jwtService = new FakeJwtService();
    ownerId = UserId.generate();
    const familyRepository = new InMemoryFamilyRepository();
    paymentMethodRepository = new InMemoryPaymentMethodRepository();
    financialItemRepository = new InMemoryFinancialItemRepository();
    preferenceRepository = new InMemoryUserPaymentMethodPreferenceRepository();
    const family = Family.create(FamilyName.of("Familia Pérez"), ownerId);
    family.pullDomainEvents();
    await familyRepository.save(family);
    familyId = family.id;
    ownerAuthorization = `Bearer ${await jwtService.sign(ownerId)}`;

    const freePaymentMethod = PaymentMethod.create(familyId, PaymentMethodName.of("Transferencia"));
    await paymentMethodRepository.save(freePaymentMethod);
    freePaymentMethodId = freePaymentMethod.id.toString();

    app = buildApp({
      jwtService,
      identity: buildTestIdentityDependencies(),
      familyAccess: buildTestFamilyAccessDependencies({ familyRepository }),
      financialTracking: buildTestFinancialTrackingDependencies({
        paymentMethodRepository,
        financialItemRepository,
        preferenceRepository,
      }),
    });
  });

  test("elimina un medio de pago sin items ni preferencias asociadas", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId.toString()}/payment-methods/${freePaymentMethodId}`,
      headers: { authorization: ownerAuthorization },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      await paymentMethodRepository.findById(PaymentMethodId.of(freePaymentMethodId)),
      null,
    );
  });

  test("rechaza el borrado cuando el medio de pago tiene movimientos asociados", async () => {
    const paymentMethod = PaymentMethod.create(familyId, PaymentMethodName.of("Tarjeta"));
    await paymentMethodRepository.save(paymentMethod);

    await financialItemRepository.save(
      FinancialItem.create(
        {
          familyId,
          recordedBy: ownerId,
          paymentMethodId: paymentMethod.id,
          amount: Money.of(5000, Currency.of("CLP")),
          category: CategoryAssignment.of(CategoryId.generate()),
          title: Title.of("Compra"),
          occurredOn: TransactionDate.of(new Date("2026-08-01")),
        },
        FinancialItemType.Expense,
      ),
    );

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId.toString()}/payment-methods/${paymentMethod.id.toString()}`,
      headers: { authorization: ownerAuthorization },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(
      JSON.parse(response.body).error,
      "FINANCIAL_TRACKING.PAYMENT_METHOD_HAS_ASSOCIATED_ITEMS",
    );
  });

  test("rechaza el borrado cuando el medio de pago es el default de algún usuario", async () => {
    await preferenceRepository.save(
      UserPaymentMethodPreference.create(
        ownerId,
        familyId,
        PaymentMethodId.of(freePaymentMethodId),
      ),
    );

    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId.toString()}/payment-methods/${freePaymentMethodId}`,
      headers: { authorization: ownerAuthorization },
    });

    assert.equal(response.statusCode, 409);
    assert.equal(
      JSON.parse(response.body).error,
      "FINANCIAL_TRACKING.PAYMENT_METHOD_IS_SOMEONES_DEFAULT",
    );
  });

  test("responde 404 cuando el medio de pago no existe", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId.toString()}/payment-methods/${PaymentMethodId.generate().toString()}`,
      headers: { authorization: ownerAuthorization },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(JSON.parse(response.body).error, "FINANCIAL_TRACKING.PAYMENT_METHOD_NOT_FOUND");
  });

  test("rechaza la solicitud sin token", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/families/${familyId.toString()}/payment-methods/${freePaymentMethodId}`,
    });

    assert.equal(response.statusCode, 401);
  });
});
