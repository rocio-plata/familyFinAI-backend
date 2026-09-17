// tests/e2e/payment-method-lifecycle.test.ts
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { eq } from "drizzle-orm";
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

describe("Flujo E2E: ciclo de vida de medios de pago", () => {
  test("renombrar, fijar como default, bloquear borrado (default / con items) y borrar uno libre", {
    skip,
  }, async () => {
    const app = buildE2eApp();
    const createdUserIds: string[] = [];
    const createdFamilyIds: string[] = [];

    try {
      const email = `e2e-pm-${Date.now()}@example.com`;
      const registerResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email, password: "Sup3rSecreta!", displayName: "Persona PM E2E" },
      });
      assert.equal(registerResponse.statusCode, 201);
      const { accessToken, defaultFamilyId, userId } = registerResponse.json();
      createdUserIds.push(userId);
      createdFamilyIds.push(defaultFamilyId);
      const authHeader = { authorization: `Bearer ${accessToken}` };

      const createPm = async (name: string) => {
        const response = await app.inject({
          method: "POST",
          url: `/families/${defaultFamilyId}/payment-methods`,
          headers: authHeader,
          payload: { name },
        });
        assert.equal(response.statusCode, 201);
        return response.json().id as string;
      };

      const defaultPmId = await createPm("Efectivo PM");
      const withItemsPmId = await createPm("Tarjeta PM");
      const freePmId = await createPm("Transferencia PM");

      const renameResponse = await app.inject({
        method: "PATCH",
        url: `/families/${defaultFamilyId}/payment-methods/${defaultPmId}`,
        headers: authHeader,
        payload: { name: "Caja Chica PM" },
      });
      assert.equal(renameResponse.statusCode, 200);
      assert.equal(renameResponse.json().name, "Caja Chica PM");

      const setDefaultResponse = await app.inject({
        method: "PUT",
        url: `/families/${defaultFamilyId}/me/default-payment-method`,
        headers: authHeader,
        payload: { paymentMethodId: defaultPmId },
      });
      assert.equal(setDefaultResponse.statusCode, 204);

      const deleteDefaultResponse = await app.inject({
        method: "DELETE",
        url: `/families/${defaultFamilyId}/payment-methods/${defaultPmId}`,
        headers: authHeader,
      });
      assert.equal(deleteDefaultResponse.statusCode, 409);

      const categoryResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/categories`,
        headers: authHeader,
        payload: { type: "EXPENSE", name: "Gastos PM" },
      });
      assert.equal(categoryResponse.statusCode, 201);
      const categoryId = categoryResponse.json().id;

      const itemResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/items`,
        headers: authHeader,
        payload: {
          amount: 5000,
          categoryId,
          paymentMethodId: withItemsPmId,
          title: "Compra PM",
          occurredOn: "2026-06-01T12:00:00.000Z",
        },
      });
      assert.equal(itemResponse.statusCode, 201);

      const deleteWithItemsResponse = await app.inject({
        method: "DELETE",
        url: `/families/${defaultFamilyId}/payment-methods/${withItemsPmId}`,
        headers: authHeader,
      });
      assert.equal(deleteWithItemsResponse.statusCode, 409);

      const deprecateResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/payment-methods/${withItemsPmId}/deprecate`,
        headers: authHeader,
      });
      assert.equal(deprecateResponse.statusCode, 204);

      const listResponse = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/payment-methods?includeDeprecated=true`,
        headers: authHeader,
      });
      assert.equal(listResponse.statusCode, 200);
      const list = listResponse.json() as { id: string; status: string }[];
      const withItemsEntry = list.find((entry) => entry.id === withItemsPmId);
      assert.equal(withItemsEntry?.status, "DEPRECATED");

      const deleteFreeResponse = await app.inject({
        method: "DELETE",
        url: `/families/${defaultFamilyId}/payment-methods/${freePmId}`,
        headers: authHeader,
      });
      assert.equal(deleteFreeResponse.statusCode, 204);

      const listAfterDeleteResponse = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/payment-methods?includeDeprecated=true`,
        headers: authHeader,
      });
      const listAfterDelete = listAfterDeleteResponse.json() as { id: string }[];
      assert.equal(
        listAfterDelete.some((entry) => entry.id === freePmId),
        false,
      );
    } finally {
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
