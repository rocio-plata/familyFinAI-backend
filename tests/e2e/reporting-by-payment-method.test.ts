// tests/e2e/reporting-by-payment-method.test.ts
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

describe("Flujo E2E: reporte de gastos por medio de pago", () => {
  test("movimientos con distintos medios de pago se reflejan en /reports/by-payment-method", {
    skip,
  }, async () => {
    const app = buildE2eApp();
    const createdUserIds: string[] = [];
    const createdFamilyIds: string[] = [];

    try {
      const email = `e2e-pm-report-${Date.now()}@example.com`;
      const registerResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email, password: "Sup3rSecreta!", displayName: "Persona PM Report E2E" },
      });
      assert.equal(registerResponse.statusCode, 201);
      const { accessToken, defaultFamilyId, userId } = registerResponse.json();
      createdUserIds.push(userId);
      createdFamilyIds.push(defaultFamilyId);
      const authHeader = { authorization: `Bearer ${accessToken}` };

      // "Efectivo" ya existe: se crea automáticamente al registrar la familia
      // (OnFamilyCreatedHandler), así que no hace falta crearlo a mano.
      const paymentMethodsResponse = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/payment-methods`,
        headers: authHeader,
      });
      assert.equal(paymentMethodsResponse.statusCode, 200);
      const cashPaymentMethod = (
        paymentMethodsResponse.json() as { id: string; name: string }[]
      ).find((entry) => entry.name === "Efectivo");
      assert.ok(cashPaymentMethod);

      const cardResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/payment-methods`,
        headers: authHeader,
        payload: { name: "Tarjeta Reporte E2E" },
      });
      assert.equal(cardResponse.statusCode, 201);
      const cardPaymentMethodId = cardResponse.json().id;

      const categoryResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/categories`,
        headers: authHeader,
        payload: { type: "EXPENSE", name: "Gastos PM Report" },
      });
      assert.equal(categoryResponse.statusCode, 201);
      const categoryId = categoryResponse.json().id;

      const period = "2026-09";
      const occurredOn = "2026-09-05T12:00:00.000Z";

      const cashItemResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/items`,
        headers: authHeader,
        payload: {
          amount: 12_000,
          categoryId,
          paymentMethodId: cashPaymentMethod.id,
          title: "Compra en efectivo",
          occurredOn,
        },
      });
      assert.equal(cashItemResponse.statusCode, 201);

      const cardItemResponse = await app.inject({
        method: "POST",
        url: `/families/${defaultFamilyId}/items`,
        headers: authHeader,
        payload: {
          amount: 7_500,
          categoryId,
          paymentMethodId: cardPaymentMethodId,
          title: "Compra con tarjeta",
          occurredOn,
        },
      });
      assert.equal(cardItemResponse.statusCode, 201);

      const reportResponse = await app.inject({
        method: "GET",
        url: `/families/${defaultFamilyId}/reports/by-payment-method?period=${period}`,
        headers: authHeader,
      });
      assert.equal(reportResponse.statusCode, 200);
      const entries = reportResponse.json() as {
        paymentMethodId: string;
        paymentMethodName: string;
        amount: number;
        currency: string;
      }[];
      const cashEntry = entries.find((entry) => entry.paymentMethodId === cashPaymentMethod.id);
      const cardEntry = entries.find((entry) => entry.paymentMethodId === cardPaymentMethodId);
      assert.equal(cashEntry?.amount, 12_000);
      assert.equal(cashEntry?.currency, "CLP");
      assert.equal(cardEntry?.amount, 7_500);
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
