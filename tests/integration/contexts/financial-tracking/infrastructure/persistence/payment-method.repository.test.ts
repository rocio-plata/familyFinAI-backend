// tests/integration/contexts/financial-tracking/infrastructure/persistence/payment-method.repository.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { FamilyId } from "../../../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import { UserId } from "../../../../../../src/contexts/family-access/domain/value-objects/user-id.js";
import { PaymentMethod } from "../../../../../../src/contexts/financial-tracking/domain/entities/payment-method.js";
import { UserPaymentMethodPreference } from "../../../../../../src/contexts/financial-tracking/domain/entities/user-payment-method-preference.js";
import { PaymentMethodName } from "../../../../../../src/contexts/financial-tracking/domain/value-objects/payment-method-name.js";
import { DrizzlePaymentMethodRepository } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-payment-method.repository.js";
import { DrizzleUserPaymentMethodPreferenceRepository } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/drizzle-user-payment-method-preference.repository.js";
import { paymentMethods } from "../../../../../../src/contexts/financial-tracking/infrastructure/persistence/schema.js";
import { db, pool } from "../../../../../../src/platform/db/connection.js";

// Requiere DATABASE_URL apuntando a un Postgres real con la migración aplicada
// (ver `npm run db:reset`). Se salta automáticamente si no está configurada.
const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

const paymentMethodRepository = new DrizzlePaymentMethodRepository();
const preferenceRepository = new DrizzleUserPaymentMethodPreferenceRepository();
const createdPaymentMethodIds: string[] = [];

after(async () => {
  if (!hasDatabase) return;
  for (const id of createdPaymentMethodIds) {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }
  await pool.end();
});

describe("Persistencia Drizzle de medios de pago (integración)", () => {
  test("guarda, busca y actualiza un medio de pago", { skip }, async () => {
    const familyId = FamilyId.generate();
    const paymentMethod = PaymentMethod.create(
      familyId,
      PaymentMethodName.of("Efectivo integración"),
    );
    createdPaymentMethodIds.push(paymentMethod.id.toString());

    await paymentMethodRepository.save(paymentMethod);
    const found = await paymentMethodRepository.findById(paymentMethod.id);
    assert.ok(found);
    assert.equal(found.name.toString(), "Efectivo integración");

    paymentMethod.rename(PaymentMethodName.of("Caja chica"));
    await paymentMethodRepository.save(paymentMethod);
    const updated = await paymentMethodRepository.findById(paymentMethod.id);
    assert.equal(updated?.name.toString(), "Caja chica");

    const byFamily = await paymentMethodRepository.findByFamilyId(familyId);
    assert.equal(byFamily.length, 1);
  });

  test("elimina un medio de pago", { skip }, async () => {
    const familyId = FamilyId.generate();
    const paymentMethod = PaymentMethod.create(
      familyId,
      PaymentMethodName.of("Transferencia integración"),
    );
    await paymentMethodRepository.save(paymentMethod);

    await paymentMethodRepository.delete(paymentMethod.id);

    assert.equal(await paymentMethodRepository.findById(paymentMethod.id), null);
  });

  test("guarda, actualiza y elimina la preferencia de un usuario", { skip }, async () => {
    const familyId = FamilyId.generate();
    const userId = UserId.generate();
    const cash = PaymentMethod.create(familyId, PaymentMethodName.of("Efectivo pref"));
    const card = PaymentMethod.create(familyId, PaymentMethodName.of("Tarjeta pref"));
    createdPaymentMethodIds.push(cash.id.toString(), card.id.toString());
    await paymentMethodRepository.save(cash);
    await paymentMethodRepository.save(card);

    await preferenceRepository.save(UserPaymentMethodPreference.create(userId, familyId, cash.id));
    const found = await preferenceRepository.findByUserAndFamily(userId, familyId);
    assert.ok(found?.defaultPaymentMethodId.equals(cash.id));
    assert.equal(await preferenceRepository.existsAnyForPaymentMethod(cash.id), true);

    const preference = UserPaymentMethodPreference.create(userId, familyId, cash.id);
    preference.changeDefault(card.id);
    await preferenceRepository.save(preference);
    const updated = await preferenceRepository.findByUserAndFamily(userId, familyId);
    assert.ok(updated?.defaultPaymentMethodId.equals(card.id));

    await preferenceRepository.delete(userId, familyId);
    assert.equal(await preferenceRepository.findByUserAndFamily(userId, familyId), null);
  });
});
