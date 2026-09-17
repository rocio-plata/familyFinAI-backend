// tests/unit/contexts/financial-tracking/get-payment-methods.query.test.ts
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { GetPaymentMethodsQuery } from "../../../../src/contexts/financial-tracking/application/queries/get-payment-methods.query.js";
import { PaymentMethod } from "../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { CategoryStatus } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-status.js";
import { PaymentMethodName } from "../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { InMemoryPaymentMethodRepository } from "./doubles/in-memory-payment-method.repository.js";

describe("GetPaymentMethodsQuery", () => {
  let query: GetPaymentMethodsQuery;
  let paymentMethodRepository: InMemoryPaymentMethodRepository;
  let familyId: FamilyId;
  let activePaymentMethod: PaymentMethod;
  let deprecatedPaymentMethod: PaymentMethod;

  beforeEach(async () => {
    paymentMethodRepository = new InMemoryPaymentMethodRepository();
    query = new GetPaymentMethodsQuery(paymentMethodRepository);
    familyId = FamilyId.generate();
    activePaymentMethod = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo"));
    deprecatedPaymentMethod = PaymentMethod.create(familyId, PaymentMethodName.of("Tarjeta"));
    deprecatedPaymentMethod.deprecate();
    await paymentMethodRepository.save(activePaymentMethod);
    await paymentMethodRepository.save(deprecatedPaymentMethod);
  });

  test("por defecto solo devuelve medios activos", async () => {
    const paymentMethods = await query.execute({ familyId });

    assert.equal(paymentMethods.length, 1);
    assert.equal(paymentMethods[0]?.id.toString(), activePaymentMethod.id.toString());
  });

  test("incluye medios deprecados cuando se solicita", async () => {
    const paymentMethods = await query.execute({ familyId, includeDeprecated: true });

    assert.equal(paymentMethods.length, 2);
  });

  test("no devuelve medios de otra familia", async () => {
    const otherPaymentMethod = PaymentMethod.create(
      FamilyId.generate(),
      PaymentMethodName.of("Transferencia"),
    );
    await paymentMethodRepository.save(otherPaymentMethod);

    const paymentMethods = await query.execute({ familyId, includeDeprecated: true });

    assert.equal(paymentMethods.length, 2);
    assert.ok(paymentMethods.every((paymentMethod) => paymentMethod.familyId.equals(familyId)));
  });

  test("devuelve lista vacía para una familia sin medios", async () => {
    const paymentMethods = await query.execute({ familyId: FamilyId.generate() });

    assert.deepEqual(paymentMethods, []);
  });

  test("mapea los campos del medio de pago a DTO", async () => {
    const [paymentMethod] = await query.execute({ familyId });

    assert.ok(paymentMethod);
    assert.equal(paymentMethod.id.toString(), activePaymentMethod.id.toString());
    assert.equal(paymentMethod.familyId.toString(), familyId.toString());
    assert.equal(paymentMethod.name.toString(), "Efectivo");
    assert.equal(paymentMethod.status, CategoryStatus.Active);
  });
});
