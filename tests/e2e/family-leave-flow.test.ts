// tests/e2e/family-leave-flow.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import { families } from "../../src/contexts/family-access/infrastructure/persistence/schema.js";
import {
  categories,
  financialItems,
  paymentMethods,
  userPaymentMethodPreferences,
} from "../../src/contexts/financial-tracking/infrastructure/persistence/schema.js";
import { users } from "../../src/contexts/identity/infrastructure/persistence/schema.js";
import {
  categoryPeriodAggregates,
  paymentMethodPeriodAggregates,
} from "../../src/contexts/reporting/infrastructure/persistence/schema.js";
import { refreshTokens } from "../../src/platform/auth/schema.js";
import { db, pool } from "../../src/platform/db/connection.js";
import { buildE2eApp } from "./build-e2e-app.js";

// Requiere DATABASE_URL apuntando a un Postgres real con la migración aplicada
// (ver `npm run db:reset`). Se salta automáticamente si no está configurada.
const hasDatabase = Boolean(process.env.DATABASE_URL);
const skip = hasDatabase ? false : "requiere DATABASE_URL";

describe("Flujo E2E: salir de una familia", () => {
  test("un MEMBER sale por sí mismo, pierde acceso y se conservan sus movimientos", {
    skip,
  }, async () => {
    const app = buildE2eApp();
    const createdUserIds: string[] = [];
    const createdFamilyIds: string[] = [];

    try {
      const register = async (label: string) => {
        const email = `e2e-leave-${label}-${Date.now()}@example.com`;
        const response = await app.inject({
          method: "POST",
          url: "/auth/register",
          payload: { email, password: "Sup3rSecreta!", displayName: `${label} E2E` },
        });
        assert.equal(response.statusCode, 201);
        const user = response.json();
        createdUserIds.push(user.userId);
        createdFamilyIds.push(user.defaultFamilyId);
        return { ...user, email, auth: { authorization: `Bearer ${user.accessToken}` } };
      };
      const owner = await register("owner");
      const member = await register("member");
      const familyId = owner.defaultFamilyId;

      const inviteResponse = await app.inject({
        method: "POST",
        url: `/families/${familyId}/invitations`,
        headers: owner.auth,
        payload: { email: member.email, role: "MEMBER" },
      });
      assert.equal(inviteResponse.statusCode, 201);
      const acceptResponse = await app.inject({
        method: "POST",
        url: `/invitations/${inviteResponse.json().id}/accept`,
        headers: member.auth,
      });
      assert.equal(acceptResponse.statusCode, 204);

      const categoryResponse = await app.inject({
        method: "POST",
        url: `/families/${familyId}/categories`,
        headers: owner.auth,
        payload: { type: "EXPENSE", name: "Gastos Salida" },
      });
      assert.equal(categoryResponse.statusCode, 201);
      const itemResponse = await app.inject({
        method: "POST",
        url: `/families/${familyId}/items`,
        headers: member.auth,
        payload: {
          amount: 1500,
          categoryId: categoryResponse.json().id,
          title: "Compra del miembro",
          occurredOn: "2026-07-01T12:00:00.000Z",
        },
      });
      assert.equal(itemResponse.statusCode, 201);

      const preferenceWhere = and(
        eq(userPaymentMethodPreferences.userId, member.userId),
        eq(userPaymentMethodPreferences.familyId, familyId),
      );
      assert.equal(
        (await db.select().from(userPaymentMethodPreferences).where(preferenceWhere)).length,
        1,
      );

      // un MEMBER no puede quitar a otra persona
      const forbiddenResponse = await app.inject({
        method: "DELETE",
        url: `/families/${familyId}/members/${owner.userId}`,
        headers: member.auth,
      });
      assert.equal(forbiddenResponse.statusCode, 403);

      const leaveResponse = await app.inject({
        method: "DELETE",
        url: `/families/${familyId}/members/${member.userId}`,
        headers: member.auth,
      });
      assert.equal(leaveResponse.statusCode, 204);

      const membershipResponse = await app.inject({
        method: "GET",
        url: `/families/${familyId}/members/me`,
        headers: member.auth,
      });
      assert.equal(membershipResponse.statusCode, 403);

      const membersResponse = await app.inject({
        method: "GET",
        url: `/families/${familyId}/members`,
        headers: owner.auth,
      });
      const members = membersResponse.json() as { userId: string }[];
      assert.deepEqual(
        members.map((entry) => entry.userId),
        [owner.userId],
      );

      // se borra su medio de pago predeterminado en esa familia, pero se conserva su movimiento
      assert.equal(
        (await db.select().from(userPaymentMethodPreferences).where(preferenceWhere)).length,
        0,
      );
      const keptItems = await db
        .select()
        .from(financialItems)
        .where(
          and(eq(financialItems.familyId, familyId), eq(financialItems.recordedBy, member.userId)),
        );
      assert.equal(keptItems.length, 1);

      // el único OWNER no puede salir
      const lastOwnerResponse = await app.inject({
        method: "DELETE",
        url: `/families/${familyId}/members/${owner.userId}`,
        headers: owner.auth,
      });
      assert.equal(lastOwnerResponse.statusCode, 400);
      assert.equal(lastOwnerResponse.json().error, "FAMILY_ACCESS.CANNOT_REMOVE_LAST_OWNER");
    } finally {
      // eliminar familias cascadea members/invitations (onDelete: "cascade"), pero NO las
      // categorías ni los medios de pago por defecto (no tienen FK hacia families).
      for (const familyId of createdFamilyIds) {
        await db.delete(financialItems).where(eq(financialItems.familyId, familyId));
        await db
          .delete(categoryPeriodAggregates)
          .where(eq(categoryPeriodAggregates.familyId, familyId));
        await db
          .delete(paymentMethodPeriodAggregates)
          .where(eq(paymentMethodPeriodAggregates.familyId, familyId));
        await db
          .delete(userPaymentMethodPreferences)
          .where(eq(userPaymentMethodPreferences.familyId, familyId));
        await db.delete(categories).where(eq(categories.familyId, familyId));
        await db.delete(paymentMethods).where(eq(paymentMethods.familyId, familyId));
        await db.delete(families).where(eq(families.id, familyId));
      }
      for (const userId of createdUserIds) {
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
        await db.delete(users).where(eq(users.id, userId));
      }
    }
  });
});

after(async () => {
  if (!hasDatabase) return;
  await pool.end();
});
