// src/contexts/financial-tracking/infrastructure/persistence/drizzle-user-payment-method-preference.repository.ts
import { and, eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { UserPaymentMethodPreference } from "../../domain/entities/user-payment-method-preference.js";
import type { UserPaymentMethodPreferenceRepository } from "../../domain/repositories/user-payment-method-preference.repository.js";
import type { PaymentMethodId } from "../../domain/value-objects/payment-method-id.js";
import { userPaymentMethodPreferences } from "./schema.js";

class DrizzleUserPaymentMethodPreferenceRepository
  implements UserPaymentMethodPreferenceRepository
{
  async save(preference: UserPaymentMethodPreference): Promise<void> {
    await db
      .insert(userPaymentMethodPreferences)
      .values({
        userId: preference.userId.toString(),
        familyId: preference.familyId.toString(),
        defaultPaymentMethodId: preference.defaultPaymentMethodId.toString(),
      })
      .onConflictDoUpdate({
        target: [userPaymentMethodPreferences.userId, userPaymentMethodPreferences.familyId],
        set: {
          defaultPaymentMethodId: preference.defaultPaymentMethodId.toString(),
        },
      });
  }

  async findByUserAndFamily(
    userId: UserId,
    familyId: FamilyId,
  ): Promise<UserPaymentMethodPreference | null> {
    const row = (
      await db
        .select()
        .from(userPaymentMethodPreferences)
        .where(
          and(
            eq(userPaymentMethodPreferences.userId, userId.toString()),
            eq(userPaymentMethodPreferences.familyId, familyId.toString()),
          ),
        )
        .limit(1)
    )[0];
    return row ? UserPaymentMethodPreference.reconstitute(row) : null;
  }

  async existsAnyForPaymentMethod(paymentMethodId: PaymentMethodId): Promise<boolean> {
    const row = (
      await db
        .select({ userId: userPaymentMethodPreferences.userId })
        .from(userPaymentMethodPreferences)
        .where(eq(userPaymentMethodPreferences.defaultPaymentMethodId, paymentMethodId.toString()))
        .limit(1)
    )[0];
    return row !== undefined;
  }

  async delete(userId: UserId, familyId: FamilyId): Promise<void> {
    await db
      .delete(userPaymentMethodPreferences)
      .where(
        and(
          eq(userPaymentMethodPreferences.userId, userId.toString()),
          eq(userPaymentMethodPreferences.familyId, familyId.toString()),
        ),
      );
  }
}

export { DrizzleUserPaymentMethodPreferenceRepository };
