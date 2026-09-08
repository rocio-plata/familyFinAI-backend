// tests/contexts/family-access/invitation.reconstitute.test.ts

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Invitation } from "../../../src/contexts/family-access/domain/entities/invitation.js";
import { InvitationStatus } from "../../../src/contexts/family-access/domain/value-objects/invitation-status.js";

describe("Invitation.reconstitute", () => {
  test("reconstruye una invitación aceptada sin disparar eventos", () => {
    const familyId = "11111111-1111-4111-8111-111111111111";
    const invitationId = "22222222-2222-4222-8222-222222222222";
    const invitedUserId = "33333333-3333-4333-8333-333333333333";
    const expiresAt = new Date("2026-09-14T10:00:00Z");

    const invitation = Invitation.reconstitute({
      id: invitationId,
      familyId,
      invitedEmail: "USER@EXAMPLE.COM",
      role: "MEMBER",
      status: InvitationStatus.Accepted,
      expiresAt,
      invitedUserId,
    });

    assert.equal(invitation.id.toString(), invitationId);
    assert.equal(invitation.familyId.toString(), familyId);
    assert.equal(invitation.invitedEmail.toString(), "user@example.com");
    assert.equal(invitation.status, InvitationStatus.Accepted);
    assert.equal(invitation.role.isOwner(), false);
    assert.equal(invitation.invitedUserId.toString(), invitedUserId);
    assert.equal(invitation.expiresAt.getTime(), expiresAt.getTime());
    assert.equal(invitation.pullDomainEvents().length, 0);
  });

  test("reconstruye una invitación pendiente sin usuario aceptante", () => {
    const invitation = Invitation.reconstitute({
      id: "22222222-2222-4222-8222-222222222222",
      familyId: "11111111-1111-4111-8111-111111111111",
      invitedEmail: "user@example.com",
      role: "OWNER",
      status: InvitationStatus.Pending,
      expiresAt: new Date("2026-09-14T10:00:00Z"),
      invitedUserId: null,
    });

    assert.throws(() => invitation.invitedUserId);
  });
});
