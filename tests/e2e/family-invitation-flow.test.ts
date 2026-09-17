// tests/e2e/family-invitation-flow.test.ts
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

describe("Flujo E2E: invitar y aceptar un miembro de familia", () => {
  test("invita por email, el invitado acepta y queda como MEMBER de la familia", {
    skip,
  }, async () => {
    const app = buildE2eApp();
    const createdUserIds: string[] = [];
    const createdFamilyIds: string[] = [];

    try {
      const ownerEmail = `e2e-owner-${Date.now()}@example.com`;
      const ownerRegisterResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: ownerEmail, password: "Sup3rSecreta!", displayName: "Owner E2E" },
      });
      assert.equal(ownerRegisterResponse.statusCode, 201);
      const owner = ownerRegisterResponse.json();
      createdUserIds.push(owner.userId);
      createdFamilyIds.push(owner.defaultFamilyId);
      const ownerAuthHeader = { authorization: `Bearer ${owner.accessToken}` };

      const memberEmail = `e2e-member-${Date.now()}@example.com`;
      const memberRegisterResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: memberEmail, password: "Sup3rSecreta!", displayName: "Member E2E" },
      });
      assert.equal(memberRegisterResponse.statusCode, 201);
      const member = memberRegisterResponse.json();
      createdUserIds.push(member.userId);
      createdFamilyIds.push(member.defaultFamilyId);
      const memberAuthHeader = { authorization: `Bearer ${member.accessToken}` };

      const inviteResponse = await app.inject({
        method: "POST",
        url: `/families/${owner.defaultFamilyId}/invitations`,
        headers: ownerAuthHeader,
        payload: { email: memberEmail, role: "MEMBER" },
      });
      assert.equal(inviteResponse.statusCode, 201);
      const invitationId = inviteResponse.json().id;

      const acceptResponse = await app.inject({
        method: "POST",
        url: `/invitations/${invitationId}/accept`,
        headers: memberAuthHeader,
      });
      assert.equal(acceptResponse.statusCode, 204);

      const membersResponse = await app.inject({
        method: "GET",
        url: `/families/${owner.defaultFamilyId}/members`,
        headers: ownerAuthHeader,
      });
      assert.equal(membersResponse.statusCode, 200);
      const members = membersResponse.json() as { userId: string; role: string }[];
      assert.equal(members.length, 2);
      const memberEntry = members.find((entry) => entry.userId === member.userId);
      assert.equal(memberEntry?.role, "MEMBER");

      const membershipResponse = await app.inject({
        method: "GET",
        url: `/families/${owner.defaultFamilyId}/members/me`,
        headers: memberAuthHeader,
      });
      assert.equal(membershipResponse.statusCode, 200);
      const membership = membershipResponse.json();
      assert.equal(membership.familyId, owner.defaultFamilyId);
      assert.equal(membership.role, "MEMBER");

      // el miembro recién aceptado ya debe tener "Efectivo" como medio de pago por defecto
      // (OnInvitationAcceptedHandler), sin necesidad de fijarlo manualmente.
      const categoryResponse = await app.inject({
        method: "POST",
        url: `/families/${owner.defaultFamilyId}/categories`,
        headers: ownerAuthHeader,
        payload: { type: "EXPENSE", name: "Gastos Compartidos" },
      });
      assert.equal(categoryResponse.statusCode, 201);
      const categoryId = categoryResponse.json().id;

      const itemResponse = await app.inject({
        method: "POST",
        url: `/families/${owner.defaultFamilyId}/items`,
        headers: memberAuthHeader,
        payload: {
          amount: 2000,
          categoryId,
          title: "Compra compartida",
          occurredOn: "2026-07-01T12:00:00.000Z",
        },
      });
      assert.equal(itemResponse.statusCode, 201);
      assert.ok(itemResponse.json().paymentMethodId);
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
