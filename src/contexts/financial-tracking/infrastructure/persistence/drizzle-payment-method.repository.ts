// src/contexts/financial-tracking/infrastructure/persistence/drizzle-payment-method.repository.ts
import { eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { PaymentMethod } from "../../domain/entities/payment-method.js";
import type { PaymentMethodRepository } from "../../domain/repositories/payment-method.repository.js";
import type { PaymentMethodId } from "../../domain/value-objects/payment-method-id.js";
import { paymentMethods } from "./schema.js";

class DrizzlePaymentMethodRepository implements PaymentMethodRepository {
  async save(paymentMethod: PaymentMethod): Promise<void> {
    await db
      .insert(paymentMethods)
      .values({
        id: paymentMethod.id.toString(),
        familyId: paymentMethod.familyId.toString(),
        name: paymentMethod.name.toString(),
        status: paymentMethod.status,
      })
      .onConflictDoUpdate({
        target: paymentMethods.id,
        set: {
          name: paymentMethod.name.toString(),
          status: paymentMethod.status,
        },
      });
  }

  async findById(paymentMethodId: PaymentMethodId): Promise<PaymentMethod | null> {
    const row = (
      await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, paymentMethodId.toString()))
        .limit(1)
    )[0];
    return row ? PaymentMethod.reconstitute(row) : null;
  }

  async findByFamilyId(familyId: FamilyId): Promise<PaymentMethod[]> {
    const rows = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.familyId, familyId.toString()));
    return rows.map((row) => PaymentMethod.reconstitute(row));
  }

  async delete(paymentMethodId: PaymentMethodId): Promise<void> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId.toString()));
  }
}

export { DrizzlePaymentMethodRepository };
